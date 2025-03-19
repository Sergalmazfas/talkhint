
/**
 * Factory for creating and configuring speech recognition instances
 */
class SpeechRecognitionFactory {
  /**
   * Create a new speech recognition instance
   */
  public static createRecognition(): SpeechRecognition | null {
    try {
      if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognitionAPI) {
          return new SpeechRecognitionAPI();
        }
      }
    } catch (error) {
      console.error('Error creating speech recognition:', error);
    }
    
    console.error('Speech recognition is not supported in this browser.');
    return null;
  }
  
  /**
   * Configure a speech recognition instance with basic settings
   */
  public static configureBasicRecognition(recognition: SpeechRecognition | null): SpeechRecognition | null {
    if (!recognition) return null;
    
    try {
      recognition.continuous = true;  // Keep continuous listening enabled
      recognition.interimResults = true;
      recognition.lang = 'en-US';  // Changed to American English for recognition
      console.log('Speech recognition configured with language:', recognition.lang);
    } catch (error) {
      console.error('Error configuring speech recognition:', error);
    }
    
    return recognition;
  }
}

export default SpeechRecognitionFactory;
