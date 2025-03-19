
import OpenAI from "openai";

/**
 * Base service that handles API key management and core OpenAI API functionality
 */
class GPTBaseService {
  protected apiKey: string | null = null;
  protected responseStyle: string = 'casual';
  protected serverProxyUrl: string = 'https://cors-anywhere-lyart-seven.vercel.app'; // Updated to user's Vercel server
  protected useServerProxy: boolean = true; // Flag to toggle between server proxy and direct API
  protected maxRetries: number = 3;
  protected timeoutMs: number = 60000;
  protected openaiClient: OpenAI | null = null;

  constructor() {
    // Try to load API key from localStorage on initialization
    const storedKey = localStorage.getItem('openai_api_key');
    if (storedKey) {
      this.apiKey = storedKey;
      this.initializeOpenAIClient();
      console.log('API key loaded from storage');
    } else {
      // No longer use the default API key if none is stored
      this.apiKey = null;
      console.log('No API key found in storage');
    }
  }

  private initializeOpenAIClient() {
    if (this.apiKey) {
      this.openaiClient = new OpenAI({
        apiKey: this.apiKey,
        dangerouslyAllowBrowser: true, // Required for client-side usage
      });
      console.log('OpenAI client initialized');
    } else {
      this.openaiClient = null;
      console.log('OpenAI client not initialized: missing API key');
    }
  }

  public setApiKey(key: string) {
    this.apiKey = key;
    localStorage.setItem('openai_api_key', key);
    this.initializeOpenAIClient();
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
    
    const requestPayload = {
      model: 'gpt-4o-mini',
      messages,
      temperature,
      max_tokens: maxTokens,
      n
    };
    
    console.log(`[${requestId}] Request payload:`, JSON.stringify(requestPayload, null, 2));

    let currentRetry = 0;
    
    while (currentRetry <= this.maxRetries) {
      if (currentRetry > 0) {
        console.log(`[${new Date().toISOString()}][${requestId}] Retry attempt ${currentRetry}/${this.maxRetries}`);
      }
      
      const startTime = Date.now();
      try {
        let response;
        
        if (this.useServerProxy) {
          // Using server proxy - server will use its own API key from environment variables
          console.log(`[${new Date().toISOString()}][${requestId}] Sending request using server proxy: ${this.serverProxyUrl}`);
          
          // Create a controller for timeout handling
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            console.log(`[${new Date().toISOString()}][${requestId}] Request timed out after ${this.timeoutMs}ms`);
            controller.abort();
          }, this.timeoutMs);
          
          // Log the origin being used
          const origin = window.location.origin;
          console.log(`[${new Date().toISOString()}][${requestId}] Using origin: ${origin}`);
          
          response = await fetch(`${this.serverProxyUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Origin': origin,
              'Accept': 'application/json',
              'Access-Control-Request-Method': 'POST',
              'Access-Control-Request-Headers': 'Content-Type'
            },
            credentials: 'omit',
            mode: 'cors',
            body: JSON.stringify(requestPayload),
            signal: controller.signal
          });
          
          // Clear the timeout since we got a response
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`[${new Date().toISOString()}][${requestId}] Server proxy error: ${response.status} ${errorText}`);
            throw new Error(`Server proxy error: ${response.status} ${errorText}`);
          }
          
          const data = await response.json();
          console.log(`[${new Date().toISOString()}][${requestId}] Server proxy response received:`, data);
          response = data;
        } else {
          // Using the OpenAI SDK with client API key
          console.log(`[${new Date().toISOString()}][${requestId}] Sending request using OpenAI SDK`);
          
          if (!this.openaiClient) {
            this.initializeOpenAIClient();
            if (!this.openaiClient) {
              throw new Error('Failed to initialize OpenAI client');
            }
          }
          
          // Create a controller for timeout handling
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            console.log(`[${new Date().toISOString()}][${requestId}] Request timed out after ${this.timeoutMs}ms`);
            controller.abort();
          }, this.timeoutMs);
          
          // Using the OpenAI SDK
          const completion = await this.openaiClient.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: messages.map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            temperature: temperature,
            max_tokens: maxTokens,
            n: n
          }, {
            signal: controller.signal as AbortSignal
          });
          
          // Clear the timeout since we got a response
          clearTimeout(timeoutId);

          // Transform the response to match the expected format
          response = {
            id: completion.id,
            choices: completion.choices.map(choice => ({
              message: {
                role: choice.message.role,
                content: choice.message.content
              },
              index: choice.index,
              finish_reason: choice.finish_reason
            }))
          };
        }

        const endTime = Date.now();
        const duration = endTime - startTime;
        console.log(`[${new Date().toISOString()}][${requestId}] API request completed in ${duration}ms`);
        
        console.log(`[${new Date().toISOString()}][${requestId}] Response successfully processed`);
        console.log(`[${requestId}] Response object structure:`, Object.keys(response));
        
        if (response.choices && response.choices.length > 0) {
          console.log(`[${requestId}] Sample response content: "${response.choices[0].message.content?.substring(0, 50)}..."`);
        }
        
        return response;
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
