
import GPTBaseService from './GPTBaseService';
import { getTranslationPrompt } from './GPTPrompts';
import { TranslationResponse, getMockTranslation } from './GPTMocks';

class GPTTranslationService extends GPTBaseService {
  public async getTranslation(text: string, sourceLanguage: string, targetLanguage: string): Promise<TranslationResponse> {
    console.log(`getTranslation called: translating from ${sourceLanguage} to ${targetLanguage}`);
    console.log('Text to translate:', text);
    
    if (!this.apiKey) {
      console.warn('API key not set for translation, using mock translation');
      return getMockTranslation(text, sourceLanguage, targetLanguage);
    }

    try {
      console.log('Preparing translation request');
      const translationPrompt = getTranslationPrompt(sourceLanguage, targetLanguage);
      console.log('Translation prompt:', translationPrompt);
      
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

      console.log('Calling OpenAI API for translation...');
      const data = await this.callOpenAI(messages, 0.3, 1000, 1);
      console.log('OpenAI API response received for translation');
      
      const translation = data.choices[0].message.content.trim();
      console.log('Extracted translation:', translation);

      return { translation };
    } catch (error) {
      console.error('Error getting translation from GPT:', error);
      console.log('Falling back to mock translation due to error');
      return getMockTranslation(text, sourceLanguage, targetLanguage);
    }
  }
}

export default GPTTranslationService;
