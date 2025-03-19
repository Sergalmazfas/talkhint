
import GPTBaseService from './GPTBaseService';
import { getTranslationPrompt } from './GPTPrompts';
import { TranslationResponse, getMockTranslation } from './GPTMocks';

class GPTTranslationService extends GPTBaseService {
  public async getTranslation(text: string, sourceLanguage: string, targetLanguage: string): Promise<TranslationResponse> {
    console.log(`[${new Date().toISOString()}] getTranslation called: translating from ${sourceLanguage} to ${targetLanguage}`);
    console.log(`Text to translate (${text.length} chars):`, text);
    
    if (!this.apiKey) {
      console.warn(`[${new Date().toISOString()}] API key not set for translation, using mock translation`);
      const mockData = getMockTranslation(text, sourceLanguage, targetLanguage);
      console.log(`[${new Date().toISOString()}] Mock translation:`, mockData);
      return mockData;
    }

    const startTime = Date.now();
    try {
      console.log(`[${new Date().toISOString()}] Preparing translation request`);
      const translationPrompt = getTranslationPrompt(sourceLanguage, targetLanguage);
      console.log(`[${new Date().toISOString()}] Translation prompt (${translationPrompt.length} chars):`, translationPrompt);
      
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

      console.log(`[${new Date().toISOString()}] Calling OpenAI API for translation...`);
      const data = await this.callOpenAI(messages, 0.3, 1000, 1);
      console.log(`[${new Date().toISOString()}] OpenAI API response received for translation`);
      
      const translation = data.choices[0].message.content.trim();
      const endTime = Date.now();
      console.log(`[${new Date().toISOString()}] Extracted translation in ${endTime - startTime}ms:`, translation);

      return { translation };
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error getting translation from GPT:`, error);
      console.log(`[${new Date().toISOString()}] Falling back to mock translation due to error`);
      const mockData = getMockTranslation(text, sourceLanguage, targetLanguage);
      console.log(`[${new Date().toISOString()}] Mock translation:`, mockData);
      return mockData;
    }
  }
}

export default GPTTranslationService;
