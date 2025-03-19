
import GPTBaseService from './GPTBaseService';
import { getBilingualPrompt } from './GPTPrompts';
import { BilingualResponse, getMockBilingualResponses } from './GPTMocks';

class GPTBilingualService extends GPTBaseService {
  public async getBilingualResponses(transcription: string): Promise<BilingualResponse> {
    console.log(`[${new Date().toISOString()}] getBilingualResponses called with text (${transcription.length} chars):`);
    console.log(transcription);
    
    if (!this.apiKey) {
      console.warn(`[${new Date().toISOString()}] API key not set for bilingual responses, using mock data`);
      const mockData = getMockBilingualResponses(transcription);
      console.log(`[${new Date().toISOString()}] Mock bilingual responses:`, mockData);
      return mockData;
    }

    const startTime = Date.now();
    try {
      console.log(`[${new Date().toISOString()}] Preparing request for bilingual responses`);
      const systemPrompt = getBilingualPrompt();
      console.log(`[${new Date().toISOString()}] Bilingual system prompt (${systemPrompt.length} chars):`, systemPrompt);
      
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

      console.log(`[${new Date().toISOString()}] Calling OpenAI API for bilingual responses...`);
      const data = await this.callOpenAI(messages, 1.0, 500, 1);
      console.log(`[${new Date().toISOString()}] OpenAI API response received for bilingual`);
      
      const content = data.choices[0].message.content.trim();
      console.log(`[${new Date().toISOString()}] Raw content from GPT (${content.length} chars):`, content);
      
      try {
        // Try to parse as JSON first
        console.log(`[${new Date().toISOString()}] Attempting to parse response as JSON`);
        const parsedResponses = JSON.parse(content);
        if (Array.isArray(parsedResponses) && parsedResponses.length > 0) {
          const endTime = Date.now();
          console.log(`[${new Date().toISOString()}] Successfully parsed JSON response in ${endTime - startTime}ms:`, parsedResponses);
          return { responses: parsedResponses };
        } else {
          console.warn(`[${new Date().toISOString()}] Parsed JSON is not in expected format`);
        }
      } catch (parseError) {
        console.log(`[${new Date().toISOString()}] Content is not valid JSON, trying to extract structured data`);
        console.log('Parse error:', parseError);
        // If not valid JSON, try to extract structured data
        const responses = this.extractBilingualResponses(content);
        if (responses.length > 0) {
          const endTime = Date.now();
          console.log(`[${new Date().toISOString()}] Extracted structured responses in ${endTime - startTime}ms:`, responses);
          return { responses };
        } else {
          console.warn(`[${new Date().toISOString()}] Could not extract structured responses`);
        }
      }
      
      console.warn(`[${new Date().toISOString()}] Could not parse GPT response, using mock data`);
      const mockData = getMockBilingualResponses(transcription);
      console.log(`[${new Date().toISOString()}] Mock bilingual responses:`, mockData);
      return mockData;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error getting bilingual responses from GPT:`, error);
      console.log(`[${new Date().toISOString()}] Falling back to mock data due to error`);
      const mockData = getMockBilingualResponses(transcription);
      console.log(`[${new Date().toISOString()}] Mock bilingual responses:`, mockData);
      return mockData;
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
}

export default GPTBilingualService;
