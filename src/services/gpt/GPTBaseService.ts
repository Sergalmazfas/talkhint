
/**
 * Base service that handles API key management and core OpenAI API functionality
 */
class GPTBaseService {
  protected apiKey: string | null = null;
  protected responseStyle: string = 'casual';
  protected apiUrl: string = 'https://api.openai.com/v1/chat/completions';

  constructor() {
    // Try to load API key from localStorage on initialization
    const storedKey = localStorage.getItem('openai_api_key');
    if (storedKey) {
      this.apiKey = storedKey;
      console.log('API key loaded from storage');
    } else {
      console.warn('No API key found in storage');
    }
  }

  public setApiKey(key: string) {
    this.apiKey = key;
    localStorage.setItem('openai_api_key', key);
    console.log('API key set and saved to storage');
  }

  public getApiKey(): string | null {
    return this.apiKey;
  }

  public setResponseStyle(style: string) {
    this.responseStyle = style;
  }

  protected async callOpenAI(messages: any[], temperature: number = 1.0, maxTokens: number = 150, n: number = 1): Promise<any> {
    if (!this.apiKey) {
      console.warn('API key not set');
      throw new Error('API key not set');
    }

    console.log(`[${new Date().toISOString()}] OpenAI API request starting`);
    console.log('Using model: gpt-4o-mini');
    console.log('Request payload:', JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature,
      max_tokens: maxTokens,
      n
    }, null, 2));

    const startTime = Date.now();
    try {
      console.log(`[${new Date().toISOString()}] Sending fetch request to ${this.apiUrl}`);
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: messages,
          temperature: temperature,
          max_tokens: maxTokens,
          n: n
        })
      });

      const endTime = Date.now();
      const duration = endTime - startTime;
      console.log(`[${new Date().toISOString()}] API request completed in ${duration}ms`);

      if (!response.ok) {
        console.error(`[${new Date().toISOString()}] API response not OK, status: ${response.status}`);
        const errorData = await response.json();
        console.error('Error response from OpenAI API:', errorData);
        throw new Error(`API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      console.log(`[${new Date().toISOString()}] Parsing API response JSON`);
      const data = await response.json();
      console.log(`[${new Date().toISOString()}] API response successfully parsed`);
      console.log('Full API response:', JSON.stringify(data, null, 2));
      return data;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error in OpenAI API request:`, error);
      throw error;
    }
  }
}

export default GPTBaseService;
