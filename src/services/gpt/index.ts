
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
    this.suggestionsService = new GPTSuggestionsService();
    this.bilingualService = new GPTBilingualService();
    this.translationService = new GPTTranslationService();
  }

  public setApiKey(key: string): void {
    this.suggestionsService.setApiKey(key);
    this.bilingualService.setApiKey(key);
    this.translationService.setApiKey(key);
  }

  public getApiKey(): string | null {
    return this.suggestionsService.getApiKey();
  }

  public setResponseStyle(style: string): void {
    this.suggestionsService.setResponseStyle(style);
  }

  public async getSuggestions(transcription: string): Promise<GPTResponse> {
    return this.suggestionsService.getSuggestions(transcription);
  }

  public async getBilingualResponses(transcription: string): Promise<BilingualResponse> {
    return this.bilingualService.getBilingualResponses(transcription);
  }

  public async getTranslation(
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<TranslationResponse> {
    return this.translationService.getTranslation(text, sourceLanguage, targetLanguage);
  }
}

// Export a singleton instance
export default new GPTService();

// Also export the interfaces for use in other components
export type { GPTResponse, BilingualResponse, TranslationResponse };
