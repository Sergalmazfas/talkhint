import GPTBaseService from './GPTBaseService';
import { getBilingualPrompt } from './GPTPrompts';
import { BilingualResponse } from './GPTMocks';
import { GPTLogger } from './utils/GPTLogger';

class GPTBilingualService extends GPTBaseService {
  public async getBilingualResponses(transcription: string): Promise<BilingualResponse> {
    GPTLogger.log(undefined, `getBilingualResponses called with text (${transcription.length} chars):`);
    GPTLogger.log(undefined, transcription);
    
    if (!this.getApiKey()) {
      GPTLogger.warn(undefined, 'API key not set for bilingual responses');
      throw new Error('API key not set for bilingual responses');
    }

    const startTime = Date.now();
    try {
      GPTLogger.log(undefined, 'Preparing request for bilingual responses');
      const systemPrompt = getBilingualPrompt();
      GPTLogger.log(undefined, `Bilingual system prompt (${systemPrompt.length} chars):`, systemPrompt);
      
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

      GPTLogger.log(undefined, 'Calling OpenAI API for bilingual responses...');
      const data = await this.callOpenAI(messages, 1.0, 500, 1);
      GPTLogger.log(undefined, 'OpenAI API response received for bilingual');
      
      const content = data.choices[0].message.content.trim();
      GPTLogger.log(undefined, `Raw content from GPT (${content.length} chars):`, content);
      
      try {
        // Try to parse as JSON first
        GPTLogger.log(undefined, 'Attempting to parse response as JSON');
        const parsedResponses = JSON.parse(content);
        if (Array.isArray(parsedResponses) && parsedResponses.length > 0) {
          const endTime = Date.now();
          GPTLogger.log(undefined, `Successfully parsed JSON response in ${endTime - startTime}ms:`, parsedResponses);
          return { responses: parsedResponses };
        } else {
          GPTLogger.warn(undefined, 'Parsed JSON is not in expected format');
        }
      } catch (parseError) {
        GPTLogger.log(undefined, 'Content is not valid JSON, trying to extract structured data');
        GPTLogger.log(undefined, 'Parse error:', parseError);
        // If not valid JSON, try to extract structured data
        const responses = this.extractBilingualResponses(content);
        if (responses.length > 0) {
          const endTime = Date.now();
          GPTLogger.log(undefined, `Extracted structured responses in ${endTime - startTime}ms:`, responses);
          return { responses };
        } else {
          GPTLogger.warn(undefined, 'Could not extract structured responses');
          throw new Error('Could not parse GPT response into valid structure');
        }
      }
      
      throw new Error('Failed to process API response');
    } catch (error) {
      GPTLogger.error(undefined, 'Error getting bilingual responses from GPT:', error);
      throw error;
    }
  }

  private extractBilingualResponses(content: string): Array<{english: string, russian: string}> {
    console.log('Extracting bilingual responses from text content');
    const responses: Array<{english: string, russian: string}> = [];
    
    // First, try to match the numbered format: "1. English text\n(Russian text)"
    const regex = /(\d+)\.\s+([^\n]+)\s*\n\s*\(([^)]+)\)/g;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      console.log('Found match:', match);
      responses.push({
        english: match[2].trim(),
        russian: match[3].trim()
      });
    }
    
    // If we found structured responses, return them
    if (responses.length > 0) {
      console.log('Found structured responses with regex:', responses.length);
      return responses.slice(0, 3); // Only return up to 3 responses
    }
    
    // Otherwise, try line-by-line parsing
    console.log('Trying line-by-line parsing');
    const lines = content.split('\n');
    console.log('Split into lines:', lines.length);
    
    let currentEnglish = '';
    let currentRussian = '';
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Look for numbered responses (e.g. "1. English text")
      const numberMatch = trimmedLine.match(/^(\d+)\.\s+(.+)$/);
      if (numberMatch) {
        console.log('Found numbered line:', trimmedLine);
        if (currentEnglish && currentRussian) {
          responses.push({ english: currentEnglish, russian: currentRussian });
          console.log('Added pair from previous iteration');
        }
        
        currentEnglish = numberMatch[2];
        currentRussian = '';
        continue;
      }
      
      // Look for Russian translations in parentheses
      if (trimmedLine.startsWith('(') && trimmedLine.endsWith(')') && currentEnglish) {
        console.log('Found Russian translation:', trimmedLine);
        currentRussian = trimmedLine.substring(1, trimmedLine.length - 1);
        
        // Add the pair to responses
        if (currentEnglish && currentRussian) {
          responses.push({ english: currentEnglish, russian: currentRussian });
          console.log('Added pair with parentheses format');
          currentEnglish = '';
          currentRussian = '';
        }
      }
    }
    
    // Add the last pair if it exists
    if (currentEnglish && currentRussian) {
      responses.push({ english: currentEnglish, russian: currentRussian });
      console.log('Added final pair');
    }
    
    console.log('Final extracted responses:', responses);
    return responses.slice(0, 3); // Only return up to 3 responses
  }

  /**
   * Checks if the API connection is working by making a small test request
   * @returns A promise that resolves to true if the connection is working, false otherwise
   */
  public async checkConnection(): Promise<boolean> {
    GPTLogger.log(undefined, 'Checking GPT API connection...');
    
    if (!this.getApiKey() && !this.config.useServerProxy) {
      GPTLogger.warn(undefined, 'API key not set and not using server proxy');
      return false;
    }

    try {
      const testMessages = [
        {
          role: "system",
          content: "Respond with a simple 'Connection test successful!' message."
        },
        {
          role: "user",
          content: "Test connection"
        }
      ];

      GPTLogger.log(undefined, 'Making test call to OpenAI API...');
      const data = await this.callOpenAI(testMessages, 0.1, 20, 1);
      
      if (data && data.choices && data.choices.length > 0) {
        GPTLogger.log(undefined, 'API connection test successful');
        return true;
      } else {
        GPTLogger.warn(undefined, 'API connection test failed: empty response');
        return false;
      }
    } catch (error) {
      GPTLogger.error(undefined, 'API connection test failed with error:', error);
      return false;
    }
  }
}

export default GPTBilingualService;
