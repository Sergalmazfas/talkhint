
/**
 * Base service that handles API key management and core OpenAI API functionality
 */
class GPTBaseService {
  protected apiKey: string | null = null;
  protected responseStyle: string = 'casual';
  protected serverProxyUrl: string = 'https://cors-anywhere-git-master-sergs-projects-149ff317.vercel.app'; // Using the updated proxy URL
  protected useServerProxy: boolean = true; // Flag to toggle between server proxy and direct API
  protected maxRetries: number = 3;
  protected timeoutMs: number = 60000;

  constructor() {
    // Try to load API key from localStorage on initialization
    const storedKey = localStorage.getItem('openai_api_key');
    if (storedKey) {
      this.apiKey = storedKey;
      console.log('API key loaded from storage');
    } else {
      // No longer use the default API key if none is stored
      this.apiKey = null;
      console.log('No API key found in storage');
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
    
    while (currentRetry <= this.maxRetries) {
      if (currentRetry > 0) {
        console.log(`[${new Date().toISOString()}][${requestId}] Retry attempt ${currentRetry}/${this.maxRetries}`);
      }
      
      const startTime = Date.now();
      try {
        console.log(`[${new Date().toISOString()}][${requestId}] Sending request to server proxy: ${this.serverProxyUrl}`);
        
        // Create an AbortController for timeout handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.log(`[${new Date().toISOString()}][${requestId}] Request timed out after ${this.timeoutMs}ms`);
          controller.abort();
        }, this.timeoutMs);
        
        // Define the request body type with optional apiKey property
        interface RequestBody {
          model: string;
          messages: any[];
          temperature: number;
          max_tokens: number;
          n: number;
          apiKey?: string;
        }
        
        // Prepare request body
        const requestBody: RequestBody = {
          model: 'gpt-4o-mini',
          messages: messages,
          temperature: temperature,
          max_tokens: maxTokens,
          n: n
        };

        // Add API key to request body if available and we're not using server proxy
        if (!this.useServerProxy && this.apiKey) {
          requestBody.apiKey = this.apiKey;
        }
        
        // Use server proxy URL with additional headers for CORS
        const response = await fetch(this.serverProxyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': requestId,
            'Origin': window.location.origin
          },
          body: JSON.stringify(requestBody),
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
        
        // For other errors, retry
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
