
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

    console.log('Using API key:', this.apiKey.substring(0, 5) + '...');
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

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error from OpenAI API:', errorData);
      throw new Error(`API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    return await response.json();
  }
}

export default GPTBaseService;
