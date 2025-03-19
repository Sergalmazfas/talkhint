
import GPTBaseService from './GPTBaseService';
import { getTranslationPrompt } from './GPTPrompts';
import { TranslationResponse, getMockTranslation } from './GPTMocks';

class GPTTranslationService extends GPTBaseService {
  public async getTranslation(text: string, sourceLanguage: string, targetLanguage: string): Promise<TranslationResponse> {
    if (!this.apiKey) {
      console.warn('API key not set, using mock translation');
      return getMockTranslation(text, sourceLanguage, targetLanguage);
    }

    try {
      console.log(`Translating from ${sourceLanguage} to ${targetLanguage}:`, text);
      const messages = [
        {
          role: "system",
          content: getTranslationPrompt(sourceLanguage, targetLanguage)
        },
        {
          role: "user",
          content: text
        }
      ];

      const data = await this.callOpenAI(messages, 0.3, 1000, 1);
      const translation = data.choices[0].message.content.trim();
      console.log('Translation result:', translation);

      return { translation };
    } catch (error) {
      console.error('Error getting translation from GPT:', error);
      return getMockTranslation(text, sourceLanguage, targetLanguage);
    }
  }
}

export default GPTTranslationService;
