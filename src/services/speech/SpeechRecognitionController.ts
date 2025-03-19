
/**
 * Manages starting and stopping the speech recognition
 */
class SpeechRecognitionController {
  private recognition: SpeechRecognition | null = null;
  private sensitivity: number = 50; // Default sensitivity level
  
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

  /**
   * Set sensitivity level (0-100)
   * This can be used to adjust how the recognition responds
   */
  public setSensitivity(value: number): void {
    this.sensitivity = Math.max(0, Math.min(100, value));
    console.log(`Speech recognition sensitivity set to: ${this.sensitivity}`);
    // In a real implementation, this might adjust parameters of the recognition
    // such as audioThreshold or other configurable settings
  }

  /**
   * Get current sensitivity level
   */
  public getSensitivity(): number {
    return this.sensitivity;
  }
}

export default SpeechRecognitionController;
