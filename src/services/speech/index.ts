
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
    try {
      this.recognition = SpeechRecognitionFactory.createRecognition();
      if (this.recognition) {
        this.recognition = SpeechRecognitionFactory.configureBasicRecognition(this.recognition);
        this.configureRecognition();
        console.log('Speech recognition initialized successfully');
      } else {
        console.error('Failed to create speech recognition instance');
      }
    } catch (error) {
      console.error('Error initializing speech recognition:', error);
    }
  }

  private configureRecognition() {
    if (!this.recognition) return;

    try {
      this.controller = new SpeechRecognitionController(this.recognition);
      this.eventHandlers = new SpeechRecognitionEventHandlers(
        this.recognition, 
        () => this.controller?.startRecognition(),
        () => this.controller?.stopRecognition()
      );
    } catch (error) {
      console.error('Error configuring recognition:', error);
    }
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
      this.initRecognition(); // Try to reinitialize
      if (!this.recognition || !this.eventHandlers) {
        return; // Still not working, exit
      }
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
    console.log('Speech recognition started');
  }

  public stopListening() {
    if (!this.recognition || !this.eventHandlers) return;

    this.isListening = false;
    this.eventHandlers.setIsListening(false);
    this.eventHandlers.clearTimeout();
    
    this.controller?.stopRecognition();
    console.log('Speech recognition stopped');
  }

  public isAvailable(): boolean {
    return this.recognition !== null;
  }

  /**
   * Set recognition sensitivity level (0-100)
   */
  public setSensitivity(value: number): void {
    if (this.controller) {
      this.controller.setSensitivity(value);
    }
  }

  /**
   * Get current sensitivity level
   */
  public getSensitivity(): number {
    return this.controller ? this.controller.getSensitivity() : 50;
  }
}

export default new SpeechService();
