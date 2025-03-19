
import SpeechRecognitionFactory from './SpeechRecognitionFactory';
import SpeechRecognitionEventHandlers from './SpeechRecognitionEventHandlers';
import SpeechRecognitionController from './SpeechRecognitionController';

/**
 * Main service that orchestrates speech recognition functionality
 */
class SpeechService {
  private recognition: SpeechRecognition | null = null;
  private isListening: boolean = false;
  private onTranscriptionCallback: ((text: string) => void) | null = null;
  private onFinalTranscriptionCallback: ((text: string) => void) | null = null;
  private eventHandlers: SpeechRecognitionEventHandlers | null = null;
  private controller: SpeechRecognitionController | null = null;

  constructor() {
    this.initRecognition();
  }

  private initRecognition() {
    this.recognition = SpeechRecognitionFactory.createRecognition();
    if (this.recognition) {
      this.recognition = SpeechRecognitionFactory.configureBasicRecognition(this.recognition);
      this.configureRecognition();
    }
  }

  private configureRecognition() {
    if (!this.recognition) return;

    this.controller = new SpeechRecognitionController(this.recognition);
    this.eventHandlers = new SpeechRecognitionEventHandlers(
      this.recognition, 
      () => this.controller?.startRecognition(),
      () => this.controller?.stopRecognition()
    );
  }

  public startListening(
    onTranscription: (text: string) => void,
    onFinalTranscription: (text: string) => void
  ) {
    if (this.isListening) {
      return;
    }

    if (!this.recognition || !this.eventHandlers) {
      console.error('Speech recognition is not available');
      return;
    }

    // Reset state
    this.onTranscriptionCallback = onTranscription;
    this.onFinalTranscriptionCallback = onFinalTranscription;
    this.isListening = true;
    
    // Setup handlers with callbacks
    this.eventHandlers.setCallbacks(onTranscription, onFinalTranscription);
    this.eventHandlers.resetTranscripts();
    this.eventHandlers.setIsListening(true);

    this.controller?.startRecognition();
  }

  public stopListening() {
    if (!this.recognition || !this.eventHandlers) return;

    this.isListening = false;
    this.eventHandlers.setIsListening(false);
    this.eventHandlers.clearTimeout();
    
    this.controller?.stopRecognition();
  }

  public isAvailable(): boolean {
    return this.recognition !== null;
  }
}

export default new SpeechService();
