
import GPTBaseService from './GPTBaseService';
import { getSystemPrompt } from './GPTPrompts';
import { GPTResponse, getMockSuggestions } from './GPTMocks';

class GPTSuggestionsService extends GPTBaseService {
  public async getSuggestions(transcription: string): Promise<GPTResponse> {
    const requestId = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    console.log(`[${new Date().toISOString()}][${requestId}] getSuggestions called with text (${transcription.length} chars):`);
    console.log(`[${requestId}] Transcription: ${transcription}`);
    
    // Check if there's a valid API key
    if (!this.apiKey || this.apiKey.trim() === '') {
      console.warn(`[${new Date().toISOString()}][${requestId}] API key not set or empty for suggestions, using mock data`);
      const mockData = getMockSuggestions(transcription);
      console.log(`[${new Date().toISOString()}][${requestId}] Mock suggestions:`, mockData);
      return mockData;
    }

    const startTime = Date.now();
    let retryCount = 0;
    const maxRetries = 2;
    
    while (retryCount <= maxRetries) {
      try {
        console.log(`[${new Date().toISOString()}][${requestId}] Preparing request for suggestions with style: ${this.responseStyle}`);
        const systemPrompt = getSystemPrompt(this.responseStyle);
        console.log(`[${new Date().toISOString()}][${requestId}] System prompt (${systemPrompt.length} chars):`, systemPrompt);
        
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

        console.log(`[${new Date().toISOString()}][${requestId}] Calling OpenAI API for suggestions...`);
        
        // Use the base service's callOpenAI method
        const data = await this.callOpenAI(messages, 1.0, 150, 3);
        
        console.log(`[${new Date().toISOString()}][${requestId}] OpenAI API response received for suggestions`);
        
        if (!data || !data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
          console.error(`[${new Date().toISOString()}][${requestId}] Invalid response format:`, data);
          throw new Error('Invalid response format from API');
        }

        // Log the whole choices array to see what we're dealing with
        console.log(`[${requestId}] Choices data:`, JSON.stringify(data.choices));
        
        // More robust handling of the choices data
        const suggestions = data.choices
          .map((choice: any) => {
            try {
              // Check different possible paths for content
              if (choice && choice.message && typeof choice.message.content === 'string') {
                return choice.message.content.trim();
              }
              // If direct structure doesn't work, try alternatives
              if (choice && typeof choice.text === 'string') {
                return choice.text.trim();
              }
              console.warn(`[${requestId}] Could not extract content from choice:`, choice);
              return null;
            } catch (err) {
              console.error(`[${requestId}] Error extracting suggestion text:`, err);
              return null;
            }
          })
          .filter(Boolean); // Remove any null/undefined values
        
        if (suggestions.length === 0) {
          console.warn(`[${new Date().toISOString()}][${requestId}] No valid suggestions extracted from API response`);
          throw new Error('No valid suggestions received');
        }

        const endTime = Date.now();
        console.log(`[${new Date().toISOString()}][${requestId}] Extracted ${suggestions.length} suggestions in ${endTime - startTime}ms:`, suggestions);
        return { suggestions };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[${new Date().toISOString()}][${requestId}] Error getting suggestions (attempt ${retryCount + 1}/${maxRetries + 1}):`, errorMessage);
        
        retryCount++;
        
        // If we've exceeded max retries, fall back to mock data
        if (retryCount > maxRetries) {
          console.log(`[${new Date().toISOString()}][${requestId}] All ${maxRetries + 1} attempts failed, falling back to mock data`);
          const mockData = getMockSuggestions(transcription);
          console.log(`[${new Date().toISOString()}][${requestId}] Mock suggestions:`, mockData);
          return mockData;
        }
        
        // Wait before retrying
        const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 5000);
        console.log(`[${new Date().toISOString()}][${requestId}] Retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    
    // This should never be reached due to the fallback in the catch block
    console.error(`[${new Date().toISOString()}][${requestId}] Unexpected execution path, using mock data`);
    return getMockSuggestions(transcription);
  }
}

export default GPTSuggestionsService;
