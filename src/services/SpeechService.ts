
class SpeechService {
  private recognition: SpeechRecognition | null = null;
  private isListening: boolean = false;
  private onTranscriptionCallback: ((text: string) => void) | null = null;
  private onFinalTranscriptionCallback: ((text: string) => void) | null = null;
  private sensitivity: number = 50;
  private currentTranscriptIndex: number = 0;
  private finalTranscript: string = '';
  private interimTranscript: string = '';
  private recognitionTimeout: NodeJS.Timeout | null = null;
  private recognitionRestartCount: number = 0;
  private maxRestartAttempts: number = 5;

  constructor() {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognitionAPI) {
        this.recognition = new SpeechRecognitionAPI();
        this.configureRecognition();
      }
    } else {
      console.error('Speech recognition is not supported in this browser.');
    }
  }

  private configureRecognition() {
    if (!this.recognition) return;

    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    // Configure to detect both Russian and English
    this.recognition.lang = 'en-US'; // Set to English for caller speech
    this.recognition.maxAlternatives = 5; // Increase alternatives for better accuracy

    this.recognition.onresult = (event) => {
      this.interimTranscript = '';
      let hasNewValidTranscript = false;
      
      // Process all results from the current session
      for (let i = this.currentTranscriptIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const confidence = event.results[i][0].confidence;
        
        if (event.results[i].isFinal) {
          // Lower the confidence threshold to capture more speech
          if (confidence > 0.3) {
            this.finalTranscript += ' ' + transcript;
            hasNewValidTranscript = true;
          }
        } else {
          this.interimTranscript += transcript;
          hasNewValidTranscript = true;
        }
      }
      
      // Clean up transcript
      const formattedTranscript = (this.finalTranscript + ' ' + this.interimTranscript).trim();
      
      if (this.onTranscriptionCallback && hasNewValidTranscript) {
        this.onTranscriptionCallback(formattedTranscript);
        // Reset restart count when we get valid results
        this.recognitionRestartCount = 0;
      }

      // Check if result is final and has sufficient content
      if (this.interimTranscript === '' && this.finalTranscript.length > 0) {
        // Reset recognition timeout if it exists
        if (this.recognitionTimeout) {
          clearTimeout(this.recognitionTimeout);
        }
        
        // Set a timeout to allow for brief pauses in speech before sending
        this.recognitionTimeout = setTimeout(() => {
          if (this.onFinalTranscriptionCallback && this.finalTranscript.trim().length > 0) {
            this.onFinalTranscriptionCallback(this.finalTranscript);
            // Reset final transcript after callback
            this.finalTranscript = '';
          }
        }, 1000); // Shorter pause (1 second) to consider speech complete
      }
      
      // Reset current index after processing all results
      this.currentTranscriptIndex = event.results.length;
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      
      // Attempt to restart recognition on error with backoff
      if (this.isListening) {
        try {
          this.stopListening();
          
          if (this.recognitionRestartCount < this.maxRestartAttempts) {
            this.recognitionRestartCount++;
            const backoffDelay = Math.min(1000 * this.recognitionRestartCount, 5000);
            
            console.log(`Restarting speech recognition (attempt ${this.recognitionRestartCount}) in ${backoffDelay}ms`);
            
            setTimeout(() => {
              if (this.isListening) {
                this.startListening(
                  this.onTranscriptionCallback || (() => {}),
                  this.onFinalTranscriptionCallback || (() => {})
                );
              }
            }, backoffDelay);
          } else {
            console.error('Maximum restart attempts reached. Speech recognition stopped.');
            this.isListening = false;
          }
        } catch (error) {
          console.error('Error restarting speech recognition:', error);
        }
      }
    };

    this.recognition.onend = () => {
      console.log('Speech recognition ended');
      
      // Automatically restart if still in listening mode
      if (this.isListening) {
        try {
          console.log('Restarting speech recognition after end event');
          this.recognition?.start();
        } catch (error) {
          console.error('Error restarting speech recognition:', error);
          
          // Try again with delay if there was an error starting
          setTimeout(() => {
            if (this.isListening) {
              try {
                this.recognition?.start();
              } catch (innerError) {
                console.error('Second attempt to restart speech recognition failed:', innerError);
              }
            }
          }, 1000);
        }
      }
    };
    
    // Add additional event handlers for better debugging
    this.recognition.onnomatch = () => {
      console.log('Speech recognition: No match found');
    };
    
    this.recognition.onaudiostart = () => {
      console.log('Speech recognition: Audio capturing started');
    };
    
    this.recognition.onaudioend = () => {
      console.log('Speech recognition: Audio capturing ended');
    };
    
    this.recognition.onsoundstart = () => {
      console.log('Speech recognition: Sound detected');
    };
    
    this.recognition.onsoundend = () => {
      console.log('Speech recognition: Sound ended');
    };
    
    this.recognition.onspeechstart = () => {
      console.log('Speech recognition: Speech detected');
    };
    
    this.recognition.onspeechend = () => {
      console.log('Speech recognition: Speech ended');
    };
  }

  public setSensitivity(value: number) {
    this.sensitivity = value;
  }

  public startListening(
    onTranscription: (text: string) => void,
    onFinalTranscription: (text: string) => void
  ) {
    if (!this.recognition) {
      console.error('Speech recognition is not available');
      return;
    }

    // Reset state
    this.finalTranscript = '';
    this.interimTranscript = '';
    this.onTranscriptionCallback = onTranscription;
    this.onFinalTranscriptionCallback = onFinalTranscription;
    this.isListening = true;
    this.currentTranscriptIndex = 0;
    this.recognitionRestartCount = 0;

    try {
      this.recognition.start();
      console.log('Speech recognition started successfully');
    } catch (error) {
      console.error('Error starting speech recognition:', error);
    }
  }

  public stopListening() {
    if (!this.recognition) return;

    this.isListening = false;
    if (this.recognitionTimeout) {
      clearTimeout(this.recognitionTimeout);
      this.recognitionTimeout = null;
    }
    
    try {
      this.recognition.stop();
      console.log('Speech recognition stopped successfully');
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
    }
  }

  public isAvailable(): boolean {
    return this.recognition !== null;
  }
}

export default new SpeechService();
