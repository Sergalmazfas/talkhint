import GPTBaseService from './GPTBaseService';
import { getBilingualPrompt } from './GPTPrompts';
import { BilingualResponse, getMockBilingualResponses } from './GPTMocks';

class GPTBilingualService extends GPTBaseService {
  public async getBilingualResponses(transcription: string): Promise<BilingualResponse> {
    if (!this.apiKey) {
      console.warn('API key not set, using mock data');
      return getMockBilingualResponses(transcription);
    }

    try {
      console.log('Getting bilingual responses for:', transcription);
      const messages = [
        {
          role: "system",
          content: getBilingualPrompt()
        },
        {
          role: "user",
          content: transcription
        }
      ];

      const data = await this.callOpenAI(messages, 1.0, 500, 1);
      console.log('OpenAI API response for bilingual:', data);
      
      const content = data.choices[0].message.content.trim();
      console.log('Raw content from GPT:', content);
      
      try {
        // Try to parse as JSON first
        const parsedResponses = JSON.parse(content);
        if (Array.isArray(parsedResponses) && parsedResponses.length > 0) {
          console.log('Successfully parsed JSON response:', parsedResponses);
          return { responses: parsedResponses };
        }
      } catch (parseError) {
        console.log('Content is not valid JSON, trying to extract structured data');
        // If not valid JSON, try to extract structured data
        const responses = this.extractBilingualResponses(content);
        if (responses.length > 0) {
          console.log('Extracted structured responses:', responses);
          return { responses };
        }
      }
      
      console.warn('Could not parse GPT response, using mock data');
      return getMockBilingualResponses(transcription);
    } catch (error) {
      console.error('Error getting bilingual responses from GPT:', error);
      return getMockBilingualResponses(transcription);
    }
  }

  private extractBilingualResponses(content: string): Array<{english: string, russian: string}> {
    const responses: Array<{english: string, russian: string}> = [];
    
    // First, try to match the numbered format: "1. English text\n(Russian text)"
    const regex = /(\d+)\.\s+([^\n]+)\s*\n\s*\(([^)]+)\)/g;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      responses.push({
        english: match[2].trim(),
        russian: match[3].trim()
      });
    }
    
    // If we found structured responses, return them
    if (responses.length > 0) {
      return responses.slice(0, 3); // Only return up to 3 responses
    }
    
    // Otherwise, try line-by-line parsing
    const lines = content.split('\n');
    
    let currentEnglish = '';
    let currentRussian = '';
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Look for numbered responses (e.g. "1. English text")
      const numberMatch = trimmedLine.match(/^(\d+)\.\s+(.+)$/);
      if (numberMatch) {
        if (currentEnglish && currentRussian) {
          responses.push({ english: currentEnglish, russian: currentRussian });
        }
        
        currentEnglish = numberMatch[2];
        currentRussian = '';
        continue;
      }
      
      // Look for Russian translations in parentheses
      if (trimmedLine.startsWith('(') && trimmedLine.endsWith(')') && currentEnglish) {
        currentRussian = trimmedLine.substring(1, trimmedLine.length - 1);
        
        // Add the pair to responses
        if (currentEnglish && currentRussian) {
          responses.push({ english: currentEnglish, russian: currentRussian });
          currentEnglish = '';
          currentRussian = '';
        }
      }
    }
    
    // Add the last pair if it exists
    if (currentEnglish && currentRussian) {
      responses.push({ english: currentEnglish, russian: currentRussian });
    }
    
    return responses.slice(0, 3); // Only return up to 3 responses
  }
}

export default GPTBilingualService;
