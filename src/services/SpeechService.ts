
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
    this.recognition.lang = 'ru-RU'; // Set to Russian as default
    this.recognition.maxAlternatives = 3; // Get multiple alternatives

    this.recognition.onresult = (event) => {
      this.interimTranscript = '';
      
      // Process all results from the current session
      for (let i = this.currentTranscriptIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const confidence = event.results[i][0].confidence;
        
        if (event.results[i].isFinal) {
          // Only add high confidence results to final transcript
          if (confidence > 0.5) {
            this.finalTranscript += ' ' + transcript;
          }
        } else {
          this.interimTranscript += transcript;
        }
      }
      
      // Clean up transcript
      const formattedTranscript = (this.finalTranscript + ' ' + this.interimTranscript).trim();
      
      if (this.onTranscriptionCallback) {
        this.onTranscriptionCallback(formattedTranscript);
      }

      // Check if result is final and has sufficient content
      if (this.interimTranscript === '' && this.finalTranscript.length > 5) {
        // Reset recognition timeout if it exists
        if (this.recognitionTimeout) {
          clearTimeout(this.recognitionTimeout);
        }
        
        // Set a timeout to allow for brief pauses in speech before sending
        this.recognitionTimeout = setTimeout(() => {
          if (this.onFinalTranscriptionCallback) {
            this.onFinalTranscriptionCallback(this.finalTranscript);
            // Reset final transcript after callback
            this.finalTranscript = '';
          }
        }, 1500); // 1.5 second pause to consider speech complete
      }
      
      // Reset current index after processing all results
      this.currentTranscriptIndex = event.results.length;
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      
      // Attempt to restart recognition on error
      if (this.isListening) {
        try {
          this.stopListening();
          setTimeout(() => {
            if (this.isListening) {
              this.startListening(
                this.onTranscriptionCallback || (() => {}),
                this.onFinalTranscriptionCallback || (() => {})
              );
            }
          }, 1000);
        } catch (error) {
          console.error('Error restarting speech recognition:', error);
        }
      }
    };

    this.recognition.onend = () => {
      // Automatically restart if still in listening mode
      if (this.isListening) {
        try {
          this.recognition?.start();
        } catch (error) {
          console.error('Error restarting speech recognition:', error);
        }
      }
    };
  }

  public setLanguage(lang: string) {
    if (this.recognition) {
      this.recognition.lang = lang;
    }
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

    try {
      this.recognition.start();
      console.log('Speech recognition started');
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
      console.log('Speech recognition stopped');
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
    }
  }

  public isAvailable(): boolean {
    return this.recognition !== null;
  }
}

export default new SpeechService();
