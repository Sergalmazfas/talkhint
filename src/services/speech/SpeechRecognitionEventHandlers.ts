
/**
 * Handles speech recognition event callbacks
 */
class SpeechRecognitionEventHandlers {
  private readonly recognition: SpeechRecognition;
  private finalTranscript: string = '';
  private interimTranscript: string = '';
  private recognitionTimeout: NodeJS.Timeout | null = null;
  private onTranscriptionCallback: ((text: string) => void) | null = null;
  private onFinalTranscriptionCallback: ((text: string) => void) | null = null;
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
    this.setupErrorHandler();
    this.setupEndHandler(startListeningCallback);
  }

  private setupResultHandler(): void {
    this.recognition.onresult = (event) => {
      this.interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          this.finalTranscript += transcript;
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
      if (this.interimTranscript === '' && this.finalTranscript.length > 0) {
        // Reset recognition timeout if it exists
        this.clearTimeout();
        
        // Set a timeout to allow for brief pauses in speech before sending
        this.recognitionTimeout = setTimeout(() => {
          if (this.onFinalTranscriptionCallback && this.finalTranscript.trim().length > 0) {
            this.onFinalTranscriptionCallback(this.finalTranscript);
            // Reset final transcript after callback
            this.finalTranscript = '';
          }
        }, 1500); // 1.5 seconds pause to consider speech complete
      }
    };
  }

  private setupErrorHandler(): void {
    this.recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
    };
  }

  private setupEndHandler(startListeningCallback: () => void): void {
    this.recognition.onend = () => {
      // Automatically restart if still in listening mode
      if (this.isListening) {
        try {
          startListeningCallback();
        } catch (error) {
          console.error('Error restarting speech recognition:', error);
        }
      }
    };
  }
}

export default SpeechRecognitionEventHandlers;
