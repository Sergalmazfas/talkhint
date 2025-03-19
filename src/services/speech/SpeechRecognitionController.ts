
/**
 * Manages starting and stopping the speech recognition
 */
class SpeechRecognitionController {
  private recognition: SpeechRecognition | null = null;
  
  constructor(recognition: SpeechRecognition | null) {
    this.recognition = recognition;
  }
  
  /**
   * Start recognition safely with error handling
   */
  public startRecognition(): void {
    if (!this.recognition) return;
    
    try {
      this.recognition.start();
      console.log('Speech recognition started successfully');
    } catch (error) {
      // If recognition is already started, recreate it
      if (error instanceof DOMException && error.message.includes('started')) {
        console.log('Recognition was already running, recreating instance');
        this.recognition.onend = null; // Remove onend handler to prevent auto restart
        try {
          this.recognition.abort(); // Try to abort current recognition
        } catch (abortError) {
          console.error('Error aborting recognition:', abortError);
        }
        
        // Return a signal that the instance needs to be recreated
        throw new Error('RECOGNITION_NEEDS_RESET');
      } else {
        console.error('Error starting speech recognition:', error);
      }
    }
  }
  
  /**
   * Stop recognition safely with error handling
   */
  public stopRecognition(): void {
    if (!this.recognition) return;
    
    try {
      this.recognition.stop();
      console.log('Speech recognition stopped successfully');
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
      // If stopping fails, try to abort
      try {
        this.recognition.abort();
        console.log('Speech recognition aborted');
      } catch (abortError) {
        console.error('Error aborting speech recognition:', abortError);
      }
    }
  }
}

export default SpeechRecognitionController;
