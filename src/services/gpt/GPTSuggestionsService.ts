
import GPTBaseService from './GPTBaseService';
import { getSystemPrompt } from './GPTPrompts';
import { GPTResponse, getMockSuggestions } from './GPTMocks';

class GPTSuggestionsService extends GPTBaseService {
  public async getSuggestions(transcription: string): Promise<GPTResponse> {
    if (!this.apiKey) {
      console.warn('API key not set, using mock data');
      return getMockSuggestions(transcription);
    }

    try {
      console.log('Getting suggestions for:', transcription);
      const messages = [
        {
          role: "system",
          content: getSystemPrompt(this.responseStyle)
        },
        {
          role: "user",
          content: transcription
        }
      ];

      const data = await this.callOpenAI(messages, 1.0, 150, 3);
      console.log('OpenAI API response:', data);
      
      const suggestions = data.choices.map((choice: any) => 
        choice.message.content.trim()
      );

      console.log('Extracted suggestions:', suggestions);
      return { suggestions };
    } catch (error) {
      console.error('Error getting suggestions from GPT:', error);
      return getMockSuggestions(transcription);
    }
  }
}

export default GPTSuggestionsService;
