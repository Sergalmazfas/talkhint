
import GPTBaseService from './GPTBaseService';
import GPTSuggestionsService from './GPTSuggestionsService';
import GPTBilingualService from './GPTBilingualService';
import GPTTranslationService from './GPTTranslationService';
import { GPTResponse, BilingualResponse, TranslationResponse } from './GPTMocks';

/**
 * Main GPT service that combines all the specialized services
 */
class GPTService {
  private suggestionsService: GPTSuggestionsService;
  private bilingualService: GPTBilingualService;
  private translationService: GPTTranslationService;

  constructor() {
    console.log('Initializing GPTService with specialized services');
    this.suggestionsService = new GPTSuggestionsService();
    this.bilingualService = new GPTBilingualService();
    this.translationService = new GPTTranslationService();
    console.log('GPT service initialization complete');
  }

  public setApiKey(key: string): void {
    console.log('Setting API key for all services');
    this.suggestionsService.setApiKey(key);
    this.bilingualService.setApiKey(key);
    this.translationService.setApiKey(key);
    console.log('API key set for all services');
  }

  public getApiKey(): string | null {
    return this.suggestionsService.getApiKey();
  }

  public setResponseStyle(style: string): void {
    console.log('Setting response style:', style);
    this.suggestionsService.setResponseStyle(style);
  }

  public async getSuggestions(transcription: string): Promise<GPTResponse> {
    console.log('GPTService: getSuggestions called');
    const result = await this.suggestionsService.getSuggestions(transcription);
    console.log('GPTService: suggestions received:', result);
    return result;
  }

  public async getBilingualResponses(transcription: string): Promise<BilingualResponse> {
    console.log('GPTService: getBilingualResponses called');
    const result = await this.bilingualService.getBilingualResponses(transcription);
    console.log('GPTService: bilingual responses received:', result);
    return result;
  }

  public async getTranslation(
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<TranslationResponse> {
    console.log('GPTService: getTranslation called');
    const result = await this.translationService.getTranslation(text, sourceLanguage, targetLanguage);
    console.log('GPTService: translation received:', result);
    return result;
  }
}

// Export a singleton instance
const gptServiceInstance = new GPTService();
console.log('GPT service singleton instance created');

export default gptServiceInstance;

// Also export the interfaces for use in other components
export type { GPTResponse, BilingualResponse, TranslationResponse };
