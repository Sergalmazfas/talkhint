
/**
 * Factory for creating and configuring speech recognition instances
 */
class SpeechRecognitionFactory {
  /**
   * Create a new speech recognition instance
   */
  public static createRecognition(): SpeechRecognition | null {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognitionAPI) {
        return new SpeechRecognitionAPI();
      }
    }
    
    console.error('Speech recognition is not supported in this browser.');
    return null;
  }
  
  /**
   * Configure a speech recognition instance with basic settings
   */
  public static configureBasicRecognition(recognition: SpeechRecognition | null): SpeechRecognition | null {
    if (!recognition) return null;
    
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    return recognition;
  }
}

export default SpeechRecognitionFactory;
