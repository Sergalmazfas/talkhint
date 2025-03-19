
class SpeechService {
  private recognition: SpeechRecognition | null = null;
  private isListening: boolean = false;
  private onTranscriptionCallback: ((text: string) => void) | null = null;
  private onFinalTranscriptionCallback: ((text: string) => void) | null = null;
  private sensitivity: number = 50;

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
    this.recognition.lang = 'ru-RU'; // Set to Russian as default based on the user's request

    this.recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0])
        .map(result => result.transcript)
        .join('');

      if (this.onTranscriptionCallback) {
        this.onTranscriptionCallback(transcript);
      }

      // Check if result is final
      if (event.results[event.results.length - 1].isFinal) {
        if (this.onFinalTranscriptionCallback) {
          this.onFinalTranscriptionCallback(transcript);
        }
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      this.stopListening();
    };

    this.recognition.onend = () => {
      if (this.isListening) {
        this.recognition?.start();
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

    this.onTranscriptionCallback = onTranscription;
    this.onFinalTranscriptionCallback = onFinalTranscription;
    this.isListening = true;

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
