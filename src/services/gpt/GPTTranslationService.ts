
import GPTBaseService from './GPTBaseService';
import { getTranslationPrompt } from './GPTPrompts';
import { TranslationResponse, getMockTranslation } from './GPTMocks';
import { GPTLogger } from './utils/GPTLogger';

class GPTTranslationService extends GPTBaseService {
  public async getTranslation(text: string, sourceLanguage: string, targetLanguage: string): Promise<TranslationResponse> {
    GPTLogger.log(undefined, `getTranslation called: translating from ${sourceLanguage} to ${targetLanguage}`);
    GPTLogger.log(undefined, `Text to translate (${text.length} chars):`, text);
    
    if (!this.getApiKey()) {
      GPTLogger.warn(undefined, 'API key not set for translation, using mock translation');
      const mockData = getMockTranslation(text, sourceLanguage, targetLanguage);
      GPTLogger.log(undefined, 'Mock translation:', mockData);
      return mockData;
    }

    const startTime = Date.now();
    try {
      GPTLogger.log(undefined, 'Preparing translation request');
      const translationPrompt = getTranslationPrompt(sourceLanguage, targetLanguage);
      GPTLogger.log(undefined, `Translation prompt (${translationPrompt.length} chars):`, translationPrompt);
      
      const messages = [
        {
          role: "system",
          content: translationPrompt
        },
        {
          role: "user",
          content: text
        }
      ];

      GPTLogger.log(undefined, 'Calling OpenAI API for translation...');
      const data = await this.callOpenAI(messages, 0.3, 1000, 1);
      GPTLogger.log(undefined, 'OpenAI API response received for translation');
      
      const translation = data.choices[0].message.content.trim();
      const endTime = Date.now();
      GPTLogger.log(undefined, `Extracted translation in ${endTime - startTime}ms:`, translation);

      return { translation };
    } catch (error) {
      GPTLogger.error(undefined, 'Error getting translation from GPT:', error);
      GPTLogger.log(undefined, 'Falling back to mock translation due to error');
      const mockData = getMockTranslation(text, sourceLanguage, targetLanguage);
      GPTLogger.log(undefined, 'Mock translation:', mockData);
      return mockData;
    }
  }
}

export default GPTTranslationService;
