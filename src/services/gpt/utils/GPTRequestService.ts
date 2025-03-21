
import OpenAI from "openai";
import { GPTLogger } from "./GPTLogger";
import { GPTServiceConfig, PROXY_SERVERS } from "../config/GPTServiceConfig";

/**
 * Service to handle OpenAI API requests
 */
export class GPTRequestService {
  private config: GPTServiceConfig;
  private openaiClient: OpenAI | null = null;

  constructor(config: GPTServiceConfig) {
    this.config = config;
    this.initializeOpenAIClient();
  }

  /**
   * Update the service configuration
   */
  public updateConfig(newConfig: GPTServiceConfig): void {
    this.config = newConfig;
    this.initializeOpenAIClient();
  }

  /**
   * Initialize the OpenAI client with the current API key
   */
  public initializeOpenAIClient(): void {
    if (this.config.apiKey && this.config.apiKey.trim() !== '') {
      try {
        this.openaiClient = new OpenAI({
          apiKey: this.config.apiKey,
          dangerouslyAllowBrowser: true, // Required for client-side usage
        });
        GPTLogger.log(undefined, 'OpenAI client initialized');
      } catch (error) {
        GPTLogger.error(undefined, 'Failed to initialize OpenAI client:', error);
        this.openaiClient = null;
      }
    } else {
      this.openaiClient = null;
      GPTLogger.log(undefined, 'OpenAI client not initialized: missing API key');
    }
  }

  /**
   * Call the OpenAI API with retry logic
   */
  public async callOpenAI(
    messages: any[], 
    temperature: number = 1.0, 
    maxTokens: number = 150, 
    n: number = 1
  ): Promise<any> {
    const requestId = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    GPTLogger.log(requestId, 'OpenAI API request starting');
    
    // Check if we have an API key when needed
    if (!this.config.useServerProxy && (!this.config.apiKey || this.config.apiKey.trim() === '')) {
      const errorMsg = 'API key is required for direct OpenAI access';
      GPTLogger.error(requestId, errorMsg);
      throw new Error(errorMsg);
    }
    
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
    GPTLogger.log(requestId, `Using proxy server: ${this.config.useServerProxy ? 'yes' : 'no'}`);
    if (this.config.useServerProxy) {
      GPTLogger.log(requestId, `Proxy URL: ${this.config.serverProxyUrl}`);
    }

    let currentRetry = 0;
    
    while (currentRetry <= this.config.maxRetries) {
      if (currentRetry > 0) {
        GPTLogger.log(requestId, `Retry attempt ${currentRetry}/${this.config.maxRetries}`);
      }
      
      const startTime = Date.now();
      try {
        let response;
        
        if (this.config.useServerProxy) {
          // Using Vercel proxy server
          response = await this.makeProxyRequest(requestId, requestPayload);
        } else {
          // Direct API access with OpenAI SDK
          response = await this.makeDirectOpenAIRequest(requestId, messages, temperature, maxTokens, n);
        }

        const endTime = Date.now();
        const duration = endTime - startTime;
        GPTLogger.log(requestId, `API request completed in ${duration}ms`);
        
        return response;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        GPTLogger.error(requestId, 'Error in API request:', errorMessage);
        
        // Check if it's a timeout
        if (errorMessage.includes('abort') || errorMessage.includes('timeout')) {
          GPTLogger.warn(requestId, `Request timed out after ${this.config.timeoutMs}ms`);
          
          if (currentRetry < this.config.maxRetries) {
            await this.backoff(requestId, currentRetry);
            currentRetry++;
            continue;
          }
        }
        
        // For other errors, retry if possible
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
   * Make a simple chat request to the server
   */
  public async makeSimpleChatRequest(message: string): Promise<any> {
    const requestId = Date.now().toString(36);
    GPTLogger.log(requestId, `Making simple chat request with message: ${message.substring(0, 30)}...`);
    
    try {
      // Properly construct the URL with domain and path
      const baseUrl = this.ensureValidUrl(this.config.serverProxyUrl);
      const chatUrl = this.ensureEndpoint(baseUrl, '/chat');
      
      GPTLogger.log(requestId, `Using chat URL: ${chatUrl}`);
      
      const response = await fetch(chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin,
          'Accept': 'application/json'
        },
        body: JSON.stringify({ message }),
        mode: 'cors', // Explicitly set CORS mode
        credentials: 'omit' // Don't send cookies for cross-origin requests
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Chat API error (${response.status}): ${errorText}`);
      }
      
      const data = await response.json();
      GPTLogger.log(requestId, 'Chat response received successfully');
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      GPTLogger.error(requestId, 'Error in makeSimpleChatRequest:', errorMessage);
      
      // Fallback to a mock response if the server is unavailable
      GPTLogger.log(requestId, 'Returning mock response as fallback');
      return {
        success: true,
        received: message,
        response: `Mock response for: "${message}" (server unavailable)`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Make a request using the Vercel proxy service
   */
  private async makeProxyRequest(requestId: string, requestPayload: any): Promise<any> {
    GPTLogger.log(requestId, `Making request via Vercel proxy: ${this.config.serverProxyUrl}`);
    
    // Create a controller for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      GPTLogger.log(requestId, `Request timed out after ${this.config.timeoutMs}ms`);
      controller.abort();
    }, this.config.timeoutMs);
    
    try {
      // Properly construct the API URL
      const baseUrl = this.ensureValidUrl(this.config.serverProxyUrl);
      const apiUrl = this.ensureEndpoint(baseUrl, '/openai/chat/completions');
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Origin': window.location.origin,
        'Accept': 'application/json'
      };
      
      // Add API key to headers if available and not empty
      if (this.config.apiKey && this.config.apiKey.trim() !== '') {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        GPTLogger.log(requestId, 'Using provided API key for authorization');
      } else {
        GPTLogger.log(requestId, 'No API key provided for request');
      }
      
      GPTLogger.log(requestId, `Constructed request URL: ${apiUrl}`);
      GPTLogger.log(requestId, `Request headers: ${JSON.stringify(headers, (key, value) => 
        key === 'Authorization' ? (value ? 'Bearer [KEY SET]' : value) : value)}`);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
        mode: 'cors',
        credentials: 'omit'  // Don't send cookies with CORS requests
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
   * Make a direct request to OpenAI API using the SDK
   */
  private async makeDirectOpenAIRequest(
    requestId: string, 
    messages: any[], 
    temperature: number, 
    maxTokens: number, 
    n: number
  ): Promise<any> {
    GPTLogger.log(requestId, 'Sending request using OpenAI SDK');
    
    if (!this.openaiClient) {
      this.initializeOpenAIClient();
      if (!this.openaiClient) {
        throw new Error('Failed to initialize OpenAI client');
      }
    }
    
    // Create a controller for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      GPTLogger.log(requestId, `Request timed out after ${this.config.timeoutMs}ms`);
      controller.abort();
    }, this.config.timeoutMs);
    
    try {
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
      
      clearTimeout(timeoutId);

      // Transform the response to match the expected format
      return {
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
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Helper method to ensure URL is valid
   */
  private ensureValidUrl(url: string): string {
    // If URL doesn't start with http(s), assume https
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }
    return url;
  }

  /**
   * Helper method to ensure endpoint path is correctly appended
   */
  private ensureEndpoint(baseUrl: string, endpoint: string): string {
    // Remove trailing slash from base URL if any
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    
    // Ensure endpoint starts with slash
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    // Check if endpoint is already in the URL
    if (cleanBaseUrl.endsWith(cleanEndpoint)) {
      return cleanBaseUrl;
    }
    
    // Check if we need to add /api before the endpoint
    if (!cleanBaseUrl.endsWith('/api') && !cleanEndpoint.startsWith('/api/')) {
      return `${cleanBaseUrl}/api${cleanEndpoint}`;
    }
    
    return `${cleanBaseUrl}${cleanEndpoint}`;
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
