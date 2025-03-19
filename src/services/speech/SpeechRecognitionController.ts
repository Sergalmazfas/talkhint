
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
    } catch (error) {
      console.error('Error starting speech recognition:', error);
    }
  }
  
  /**
   * Stop recognition safely with error handling
   */
  public stopRecognition(): void {
    if (!this.recognition) return;
    
    try {
      this.recognition.stop();
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
    }
  }
}

export default SpeechRecognitionController;
