
import GPTBaseService from './GPTBaseService';
import { getSystemPrompt } from './GPTPrompts';
import { GPTResponse, getMockSuggestions } from './GPTMocks';

class GPTSuggestionsService extends GPTBaseService {
  public async getSuggestions(transcription: string): Promise<GPTResponse> {
    console.log(`[${new Date().toISOString()}] getSuggestions called with text (${transcription.length} chars):`);
    console.log(transcription);
    
    if (!this.apiKey) {
      console.warn(`[${new Date().toISOString()}] API key not set for suggestions, using mock data`);
      const mockData = getMockSuggestions(transcription);
      console.log(`[${new Date().toISOString()}] Mock suggestions:`, mockData);
      return mockData;
    }

    const startTime = Date.now();
    try {
      console.log(`[${new Date().toISOString()}] Preparing request for suggestions with style: ${this.responseStyle}`);
      const systemPrompt = getSystemPrompt(this.responseStyle);
      console.log(`[${new Date().toISOString()}] System prompt (${systemPrompt.length} chars):`, systemPrompt);
      
      const messages = [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: transcription
        }
      ];

      console.log(`[${new Date().toISOString()}] Calling proxy API for suggestions...`);
      const data = await this.callOpenAI(messages, 1.0, 150, 3);
      console.log(`[${new Date().toISOString()}] Proxy API response received for suggestions`);
      
      if (!data || !data.choices || !Array.isArray(data.choices)) {
        console.error(`[${new Date().toISOString()}] Invalid proxy response format:`, data);
        throw new Error('Invalid response format from proxy');
      }
      
      const suggestions = data.choices.map((choice: any) => 
        choice.message?.content?.trim() || ''
      ).filter(Boolean);
      
      if (suggestions.length === 0) {
        console.warn(`[${new Date().toISOString()}] No valid suggestions in proxy response`);
        throw new Error('No valid suggestions received');
      }

      const endTime = Date.now();
      console.log(`[${new Date().toISOString()}] Extracted suggestions in ${endTime - startTime}ms:`, suggestions);
      return { suggestions };
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error getting suggestions from proxy:`, error);
      console.log(`[${new Date().toISOString()}] Falling back to mock data due to error`);
      const mockData = getMockSuggestions(transcription);
      console.log(`[${new Date().toISOString()}] Mock suggestions:`, mockData);
      return mockData;
    }
  }
}

export default GPTSuggestionsService;
