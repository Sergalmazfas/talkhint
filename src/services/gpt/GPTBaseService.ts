
/**
 * Base service that handles API key management and core OpenAI API functionality
 */
class GPTBaseService {
  protected apiKey: string | null = null;
  protected responseStyle: string = 'casual';
  protected apiUrl: string = 'https://api.openai.com/v1/chat/completions';
  protected proxyUrl: string = 'https://cors-anywhere-lyart-seven.vercel.app/';
  protected maxRetries: number = 3; // Increased from 2 to 3
  protected timeoutMs: number = 60000; // Increased from 30s to 60s
  protected defaultApiKey: string = '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'; // Fallback API key
  protected fallbackProxies: string[] = [
    'https://cors-anywhere-lyart-seven.vercel.app/',
    'https://cors-proxy.fringe.zone/',
    'https://corsproxy.io/?',
    'https://api.allorigins.win/raw?url='
  ];

  constructor() {
    // Try to load API key from localStorage on initialization
    const storedKey = localStorage.getItem('openai_api_key');
    if (storedKey) {
      this.apiKey = storedKey;
      console.log('API key loaded from storage');
    } else {
      // Use the default API key if none is stored
      this.apiKey = this.defaultApiKey;
      console.log('Using default API key');
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

    const requestId = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    console.log(`[${new Date().toISOString()}][${requestId}] OpenAI API request starting`);
    console.log(`[${requestId}] Using model: gpt-4o-mini`);
    console.log(`[${requestId}] Request payload:`, JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature,
      max_tokens: maxTokens,
      n
    }, null, 2));

    let currentRetry = 0;
    let proxyIndex = 0;
    
    while (currentRetry <= this.maxRetries) {
      if (currentRetry > 0) {
        console.log(`[${new Date().toISOString()}][${requestId}] Retry attempt ${currentRetry}/${this.maxRetries}`);
        // On retry, try a different proxy
        proxyIndex = (proxyIndex + 1) % this.fallbackProxies.length;
        this.proxyUrl = this.fallbackProxies[proxyIndex];
        console.log(`[${new Date().toISOString()}][${requestId}] Switching to proxy: ${this.proxyUrl}`);
      }
      
      const startTime = Date.now();
      try {
        console.log(`[${new Date().toISOString()}][${requestId}] Sending fetch request to OpenAI via proxy`);
        
        // Create an AbortController for timeout handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.log(`[${new Date().toISOString()}][${requestId}] Request timed out after ${this.timeoutMs}ms`);
          controller.abort();
        }, this.timeoutMs);
        
        // Use proxy URL + target URL
        const proxiedUrl = `${this.proxyUrl}${this.apiUrl}`;
        console.log(`[${new Date().toISOString()}][${requestId}] Using proxy URL: ${proxiedUrl}`);
        
        const response = await fetch(proxiedUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'X-Requested-With': 'XMLHttpRequest', // Required by some CORS proxies
            'Origin': window.location.origin,
            'X-Cors-Api-Key': 'temp_3e4ed26e97d3f60b2b7e3548cdd93313' // Added in case the proxy requires an API key
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: messages,
            temperature: temperature,
            max_tokens: maxTokens,
            n: n
          }),
          signal: controller.signal
        });
        
        // Clear the timeout since we got a response
        clearTimeout(timeoutId);

        const endTime = Date.now();
        const duration = endTime - startTime;
        console.log(`[${new Date().toISOString()}][${requestId}] API request completed in ${duration}ms`);

        if (!response.ok) {
          console.error(`[${new Date().toISOString()}][${requestId}] Response not OK, status: ${response.status}`);
          let errorData;
          try {
            errorData = await response.json();
            console.error(`[${requestId}] Error response:`, errorData);
          } catch (e) {
            // If parsing JSON fails, use text
            const errorText = await response.text();
            console.error(`[${requestId}] Error response text:`, errorText);
            errorData = { error: { message: errorText } };
          }
          
          // Rate limiting or server error - retry
          if (response.status === 429 || response.status >= 500) {
            if (currentRetry < this.maxRetries) {
              const backoffTime = Math.min(1000 * Math.pow(2, currentRetry), 10000);
              console.log(`[${new Date().toISOString()}][${requestId}] Backing off for ${backoffTime}ms before retry`);
              await new Promise(resolve => setTimeout(resolve, backoffTime));
              currentRetry++;
              continue;
            }
          }
          
          throw new Error(`API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
        }

        console.log(`[${new Date().toISOString()}][${requestId}] Parsing response JSON`);
        const data = await response.json();
        console.log(`[${new Date().toISOString()}][${requestId}] Response successfully parsed`);
        console.log(`[${requestId}] Response object structure:`, Object.keys(data));
        
        if (data.choices && data.choices.length > 0) {
          console.log(`[${requestId}] Sample response content: "${data.choices[0].message.content.substring(0, 50)}..."`);
        }
        
        return data;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[${new Date().toISOString()}][${requestId}] Error in API request:`, errorMessage);
        
        // Check if it's an abort error (timeout)
        if (errorMessage.includes('abort') || errorMessage.includes('timeout')) {
          console.warn(`[${new Date().toISOString()}][${requestId}] Request timed out after ${this.timeoutMs}ms`);
          
          if (currentRetry < this.maxRetries) {
            const backoffTime = Math.min(1000 * Math.pow(2, currentRetry), 10000);
            console.log(`[${new Date().toISOString()}][${requestId}] Backing off for ${backoffTime}ms before retry`);
            await new Promise(resolve => setTimeout(resolve, backoffTime));
            currentRetry++;
            continue;
          }
        }
        
        // For other errors, retry with a different proxy
        if (currentRetry < this.maxRetries) {
          const backoffTime = Math.min(1000 * Math.pow(2, currentRetry), 10000);
          console.log(`[${new Date().toISOString()}][${requestId}] Backing off for ${backoffTime}ms before retry`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
          currentRetry++;
          continue;
        }
        
        throw error;
      }
    }
    
    throw new Error(`Failed after ${this.maxRetries} retries`);
  }
}

export default GPTBaseService;
