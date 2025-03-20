import OpenAI from "openai";
import { GPTLogger } from "./GPTLogger";
import { GPTServiceConfig, PROXY_SERVERS } from "../config/GPTServiceConfig";

/**
 * Service to handle OpenAI API requests
 */
export class GPTRequestService {
  private config: GPTServiceConfig;

  constructor(config: GPTServiceConfig) {
    this.config = config;
  }

  /**
   * Update the service configuration
   */
  public updateConfig(newConfig: GPTServiceConfig): void {
    this.config = newConfig;
  }

  /**
   * Call the OpenAI API with retry logic
   * Always uses the server proxy
   */
  public async callOpenAI(
    messages: any[], 
    temperature: number = 1.0, 
    maxTokens: number = 150, 
    n: number = 1
  ): Promise<any> {
    const requestId = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    GPTLogger.log(requestId, 'OpenAI API request starting via server proxy');
    
    // Using gpt-4o-mini model - more affordable
    GPTLogger.log(requestId, 'Using model: gpt-4o-mini');
    
    const requestPayload = {
      model: 'gpt-4o-mini',
      messages,
      temperature,
      max_tokens: maxTokens,
      n
    };
    
    GPTLogger.log(requestId, 'Request payload prepared');
    
    // Make sure we're using the lovable-server.vercel.app proxy
    if (!this.config.serverProxyUrl.includes('lovable-server.vercel.app')) {
      console.warn(`[GPTRequestService] Changing proxy from ${this.config.serverProxyUrl} to lovable-server.vercel.app`);
      this.config.serverProxyUrl = PROXY_SERVERS.VERCEL;
    }
    
    GPTLogger.log(requestId, `Proxy URL: ${this.config.serverProxyUrl}`);

    let currentRetry = 0;
    
    while (currentRetry <= this.config.maxRetries) {
      if (currentRetry > 0) {
        GPTLogger.log(requestId, `Retry attempt ${currentRetry}/${this.config.maxRetries}`);
      }
      
      const startTime = Date.now();
      try {
        // Using proxy server
        const response = await this.makeProxyRequest(requestId, requestPayload);
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        GPTLogger.log(requestId, `API request completed in ${duration}ms`);
        
        return response;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        GPTLogger.error(requestId, 'Error in API request:', errorMessage);
        
        // For any errors, retry if possible
        if (currentRetry < this.config.maxRetries) {
          await this.backoff(requestId, currentRetry);
          currentRetry++;
          continue;
        }
        
        throw error;
      }
    }
    
    throw new Error(`Failed after ${this.config.maxRetries} retries`);
  }

  /**
   * Make a simple chat request to the configured server
   */
  public async makeSimpleChatRequest(message: string): Promise<any> {
    const requestId = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    let retryCount = 0;
    
    const tryRequest = async () => {
      try {
        const serverUrl = this.config.serverProxyUrl;
        GPTLogger.log(requestId, `Making chat request to ${serverUrl}`);
        
        // Add timestamp to help prevent caching issues
        const timestamp = Date.now();
        const url = `${serverUrl}/api/chat?_t=${timestamp}`;
        
        // Create a controller for timeout handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, this.config.timeoutMs);
        
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Origin': window.location.origin,
              'Authorization': this.config.apiKey ? `Bearer ${this.config.apiKey}` : undefined,
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            },
            body: JSON.stringify({ message }),
            mode: 'cors',
            credentials: 'omit',
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server error: ${response.status} - ${errorText}`);
          }
          
          return await response.json();
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      } catch (error) {
        console.error("Error sending message:", error);
        // If server unreachable, try an alternative proxy
        if (retryCount < this.config.maxRetries) {
          const proxyOptions = Object.values(PROXY_SERVERS);
          const currentIndex = proxyOptions.indexOf(this.config.serverProxyUrl);
          const nextIndex = (currentIndex + 1) % proxyOptions.length;
          const newProxyUrl = proxyOptions[nextIndex];
          
          if (newProxyUrl !== this.config.serverProxyUrl) {
            GPTLogger.log(requestId, `Switching to alternative proxy for chat: ${newProxyUrl}`);
            this.config.serverProxyUrl = newProxyUrl;
            retryCount++;
            return tryRequest(); // Try again with new proxy
          }
        }
        
        // Fallback to mock response if all servers are unreachable
        return {
          success: false,
          received: message,
          response: `Could not connect to server. Local response: "${message}"`,
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : String(error)
        };
      }
    };
    
    return tryRequest();
  }

  /**
   * Make a request using the proxy service
   */
  private async makeProxyRequest(requestId: string, requestPayload: any): Promise<any> {
    GPTLogger.log(requestId, `Making request via proxy: ${this.config.serverProxyUrl}`);
    
    // Create a controller for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      GPTLogger.log(requestId, `Request timed out after ${this.config.timeoutMs}ms`);
      controller.abort();
    }, this.config.timeoutMs);

    // Add timestamp to prevent caching
    const timestamp = Date.now();

    // Different proxies have different URL patterns
    const isAllOrigins = this.config.serverProxyUrl.includes('allorigins');
    const isCorsproxy = this.config.serverProxyUrl.includes('corsproxy.io');
    const isThingproxy = this.config.serverProxyUrl.includes('thingproxy');
    const isVercel = this.config.serverProxyUrl.includes('vercel.app') || this.config.serverProxyUrl.includes('lovable-server');
    
    try {
      let url;
      let headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Origin': window.location.origin,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      };
      
      // Add API key to headers if available
      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }
      
      // Different URL construction based on proxy type
      if (isAllOrigins) {
        // For allorigins, the target is already in the URL
        url = `${this.config.serverProxyUrl}/chat/completions?_t=${timestamp}`;
      } else if (isCorsproxy) {
        // For corsproxy.io, the target is already in the URL
        url = `${this.config.serverProxyUrl}/chat/completions?_t=${timestamp}`;
      } else if (isThingproxy) {
        // For thingproxy, the target is already in the URL
        url = `${this.config.serverProxyUrl}/chat/completions?_t=${timestamp}`;
      } else if (isVercel) {
        // For Vercel deployment
        url = `${this.config.serverProxyUrl}/api/openai/chat/completions?_t=${timestamp}`;
      } else {
        // Default behavior for direct or unknown proxies
        url = `${this.config.serverProxyUrl}/api/openai/chat/completions?_t=${timestamp}`;
      }
      
      GPTLogger.log(requestId, `Constructed request URL: ${url}`);
      GPTLogger.log(requestId, `Using headers: ${JSON.stringify(headers)}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
        mode: 'cors',
        credentials: 'omit',  // Don't send cookies with CORS requests
        redirect: 'follow'    // Follow redirects if any
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        const errorMessage = `API error: ${response.status} ${errorText}`;
        GPTLogger.error(requestId, errorMessage);
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      GPTLogger.log(requestId, 'API response received successfully');
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Implement exponential backoff for retries
   */
  private async backoff(requestId: string, retryCount: number): Promise<void> {
    const backoffTime = Math.min(1000 * Math.pow(2, retryCount), 10000);
    GPTLogger.log(requestId, `Backing off for ${backoffTime}ms before retry`);
    await new Promise(resolve => setTimeout(resolve, backoffTime));
  }
}
