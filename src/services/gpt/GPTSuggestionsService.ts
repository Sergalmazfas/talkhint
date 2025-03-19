
import GPTBaseService from './GPTBaseService';
import { getSystemPrompt } from './GPTPrompts';
import { GPTResponse, getMockSuggestions } from './GPTMocks';
import { GPTLogger } from './utils/GPTLogger';

class GPTSuggestionsService extends GPTBaseService {
  public async getSuggestions(transcription: string): Promise<GPTResponse> {
    const requestId = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    GPTLogger.log(requestId, `getSuggestions called with text (${transcription.length} chars):`);
    GPTLogger.log(requestId, `Transcription: ${transcription}`);
    
    // Check if there's a valid API key
    if (!this.getApiKey() || this.getApiKey()?.trim() === '') {
      GPTLogger.warn(requestId, 'API key not set or empty for suggestions, using mock data');
      const mockData = getMockSuggestions(transcription);
      GPTLogger.log(requestId, 'Mock suggestions:', mockData);
      return mockData;
    }

    const startTime = Date.now();
    let retryCount = 0;
    const maxRetries = 2;
    
    while (retryCount <= maxRetries) {
      try {
        GPTLogger.log(requestId, `Preparing request for suggestions with style: ${this.getResponseStyle()}`);
        const systemPrompt = getSystemPrompt(this.getResponseStyle());
        GPTLogger.log(requestId, `System prompt (${systemPrompt.length} chars):`, systemPrompt);
        
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

        GPTLogger.log(requestId, 'Calling OpenAI API for suggestions...');
        
        // Use the base service's callOpenAI method
        const data = await this.callOpenAI(messages, 1.0, 150, 3);
        
        GPTLogger.log(requestId, 'OpenAI API response received for suggestions');
        
        if (!data || !data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
          GPTLogger.error(requestId, 'Invalid response format:', data);
          throw new Error('Invalid response format from API');
        }

        // Log the whole choices array to see what we're dealing with
        GPTLogger.log(requestId, 'Choices data:', JSON.stringify(data.choices));
        
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
              GPTLogger.warn(requestId, 'Could not extract content from choice:', choice);
              return null;
            } catch (err) {
              GPTLogger.error(requestId, 'Error extracting suggestion text:', err);
              return null;
            }
          })
          .filter(Boolean); // Remove any null/undefined values
        
        if (suggestions.length === 0) {
          GPTLogger.warn(requestId, 'No valid suggestions extracted from API response');
          throw new Error('No valid suggestions received');
        }

        const endTime = Date.now();
        GPTLogger.log(requestId, `Extracted ${suggestions.length} suggestions in ${endTime - startTime}ms:`, suggestions);
        return { suggestions };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        GPTLogger.error(requestId, `Error getting suggestions (attempt ${retryCount + 1}/${maxRetries + 1}):`, errorMessage);
        
        retryCount++;
        
        // If we've exceeded max retries, fall back to mock data
        if (retryCount > maxRetries) {
          GPTLogger.log(requestId, `All ${maxRetries + 1} attempts failed, falling back to mock data`);
          const mockData = getMockSuggestions(transcription);
          GPTLogger.log(requestId, 'Mock suggestions:', mockData);
          return mockData;
        }
        
        // Wait before retrying
        const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 5000);
        GPTLogger.log(requestId, `Retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    
    // This should never be reached due to the fallback in the catch block
    GPTLogger.error(requestId, 'Unexpected execution path, using mock data');
    return getMockSuggestions(transcription);
  }
}

export default GPTSuggestionsService;
