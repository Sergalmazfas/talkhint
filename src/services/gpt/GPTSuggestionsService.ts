
import GPTBaseService from './GPTBaseService';
import { getSystemPrompt } from './GPTPrompts';
import { GPTResponse, getMockSuggestions } from './GPTMocks';

class GPTSuggestionsService extends GPTBaseService {
  public async getSuggestions(transcription: string): Promise<GPTResponse> {
    console.log('getSuggestions called with:', transcription);
    
    if (!this.apiKey) {
      console.warn('API key not set for suggestions, using mock data');
      return getMockSuggestions(transcription);
    }

    try {
      console.log('Preparing request for suggestions with style:', this.responseStyle);
      const systemPrompt = getSystemPrompt(this.responseStyle);
      console.log('System prompt:', systemPrompt);
      
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

      console.log('Calling OpenAI API for suggestions...');
      const data = await this.callOpenAI(messages, 1.0, 150, 3);
      console.log('OpenAI API response received for suggestions');
      
      const suggestions = data.choices.map((choice: any) => 
        choice.message.content.trim()
      );

      console.log('Extracted suggestions:', suggestions);
      return { suggestions };
    } catch (error) {
      console.error('Error getting suggestions from GPT:', error);
      console.log('Falling back to mock data due to error');
      return getMockSuggestions(transcription);
    }
  }
}

export default GPTSuggestionsService;
