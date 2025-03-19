
/**
 * Handles speech recognition event callbacks
 */
class SpeechRecognitionEventHandlers {
  private readonly recognition: SpeechRecognition;
  private currentTranscriptIndex: number = 0;
  private finalTranscript: string = '';
  private interimTranscript: string = '';
  private recognitionTimeout: NodeJS.Timeout | null = null;
  private onTranscriptionCallback: ((text: string) => void) | null = null;
  private onFinalTranscriptionCallback: ((text: string) => void) | null = null;
  private recognitionRestartCount: number = 0;
  private maxRestartAttempts: number = 5;
  private isListening: boolean = false;

  constructor(
    recognition: SpeechRecognition,
    startListeningCallback: () => void,
    stopListeningCallback: () => void
  ) {
    this.recognition = recognition;
    this.setupEventHandlers(startListeningCallback, stopListeningCallback);
  }

  public setCallbacks(
    onTranscription: ((text: string) => void) | null,
    onFinalTranscription: ((text: string) => void) | null
  ): void {
    this.onTranscriptionCallback = onTranscription;
    this.onFinalTranscriptionCallback = onFinalTranscription;
  }

  public setIsListening(value: boolean): void {
    this.isListening = value;
  }

  public resetTranscripts(): void {
    this.finalTranscript = '';
    this.interimTranscript = '';
    this.currentTranscriptIndex = 0;
    this.recognitionRestartCount = 0;
  }

  public clearTimeout(): void {
    if (this.recognitionTimeout) {
      clearTimeout(this.recognitionTimeout);
      this.recognitionTimeout = null;
    }
  }

  private setupEventHandlers(
    startListeningCallback: () => void,
    stopListeningCallback: () => void
  ): void {
    this.setupResultHandler();
    this.setupErrorHandler(stopListeningCallback, startListeningCallback);
    this.setupEndHandler(startListeningCallback);
  }

  private setupResultHandler(): void {
    this.recognition.onresult = (event) => {
      this.interimTranscript = '';
      let hasNewValidTranscript = false;
      
      // Process all results from the current session
      for (let i = this.currentTranscriptIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const confidence = event.results[i][0].confidence;
        
        if (event.results[i].isFinal) {
          // Lower the confidence threshold to capture more speech
          if (confidence > 0.1) { // Lowered threshold further from 0.3 to 0.1
            this.finalTranscript += ' ' + transcript;
            hasNewValidTranscript = true;
            console.log(`Final transcript received with confidence ${confidence}: ${transcript}`);
          }
        } else {
          this.interimTranscript += transcript;
          hasNewValidTranscript = true;
          console.log(`Interim transcript: ${transcript}`);
        }
      }
      
      // Clean up transcript
      const formattedTranscript = (this.finalTranscript + ' ' + this.interimTranscript).trim();
      
      if (this.onTranscriptionCallback && hasNewValidTranscript) {
        this.onTranscriptionCallback(formattedTranscript);
        console.log(`Transcribed text: ${formattedTranscript}`);
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
            console.log(`Final transcription: ${this.finalTranscript}`);
            this.onFinalTranscriptionCallback(this.finalTranscript);
            // Reset final transcript after callback
            this.finalTranscript = '';
          }
        }, 1000); // Shorter pause (1 second) to consider speech complete
      }
      
      // Reset current index after processing all results
      this.currentTranscriptIndex = event.results.length;
    };
  }

  private setupErrorHandler(
    stopListeningCallback: () => void, 
    startListeningCallback: () => void
  ): void {
    this.recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      
      // Attempt to restart recognition on error with backoff
      if (this.isListening) {
        try {
          stopListeningCallback();
          
          if (this.recognitionRestartCount < this.maxRestartAttempts) {
            this.recognitionRestartCount++;
            const backoffDelay = Math.min(1000 * this.recognitionRestartCount, 5000);
            
            console.log(`Restarting speech recognition (attempt ${this.recognitionRestartCount}) in ${backoffDelay}ms`);
            
            setTimeout(() => {
              if (this.isListening) {
                startListeningCallback();
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
  }

  private setupEndHandler(startListeningCallback: () => void): void {
    this.recognition.onend = () => {
      console.log('Speech recognition ended');
      
      // Automatically restart if still in listening mode
      if (this.isListening) {
        try {
          console.log('Restarting speech recognition after end event');
          startListeningCallback();
        } catch (error) {
          console.error('Error restarting speech recognition:', error);
          
          // Try again with delay if there was an error starting
          setTimeout(() => {
            if (this.isListening) {
              try {
                startListeningCallback();
              } catch (innerError) {
                console.error('Second attempt to restart speech recognition failed:', innerError);
              }
            }
          }, 1000);
        }
      }
    };
  }
}

export default SpeechRecognitionEventHandlers;
