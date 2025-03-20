
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
    if (this.config.apiKey) {
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
    if (!this.config.useServerProxy && !this.config.apiKey) {
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
        
        // If we've had multiple failures with one proxy, try another one
        if (currentRetry >= 2 && this.config.useServerProxy) {
          // Get a list of available proxies
          const proxyOptions = Object.values(PROXY_SERVERS);
          const currentIndex = proxyOptions.indexOf(this.config.serverProxyUrl);
          const nextIndex = (currentIndex + 1) % proxyOptions.length;
          const newProxyUrl = proxyOptions[nextIndex];
          
          if (newProxyUrl !== this.config.serverProxyUrl) {
            GPTLogger.log(requestId, `Switching to alternative proxy: ${newProxyUrl}`);
            this.config.serverProxyUrl = newProxyUrl;
          }
        }
      }
      
      const startTime = Date.now();
      try {
        let response;
        
        if (this.config.useServerProxy) {
          // Using proxy server
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
   * Make a simple chat request to the configured server
   */
  public async makeSimpleChatRequest(message: string): Promise<any> {
    try {
      const serverUrl = this.determineServerUrl();
      GPTLogger.log('chat', `Making chat request to ${serverUrl}`);
      
      const response = await fetch(`${serverUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
        mode: 'cors',
        credentials: 'omit'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error("Ошибка при отправке сообщения:", error);
      // Fallback to mock response if server is unreachable
      return {
        success: true,
        received: message,
        response: `Не удалось связаться с сервером. Локальный ответ: "${message}"`,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Determine the appropriate server URL
   */
  private determineServerUrl(): string {
    // Проверка production окружения
    if (window.location.hostname === 'lovable.dev') {
      // В production используем Vercel URL
      return 'https://lovable-server.vercel.app';
    }
    
    // Для разработки используем локальный сервер
    return 'http://localhost:3000';
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

    // Different proxies have different URL patterns
    const isAllOrigins = this.config.serverProxyUrl.includes('allorigins');
    const isCorsproxy = this.config.serverProxyUrl.includes('corsproxy.io');
    const isThingproxy = this.config.serverProxyUrl.includes('thingproxy');
    const isVercel = this.config.serverProxyUrl.includes('vercel.app') || this.config.serverProxyUrl.includes('lovable-server');
    
    try {
      let url;
      let headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // Add API key to headers if available
      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }
      
      // Different URL construction based on proxy type
      if (isAllOrigins) {
        // For allorigins, the target is already in the URL
        url = `${this.config.serverProxyUrl}/chat/completions`;
      } else if (isCorsproxy) {
        // For corsproxy.io, the target is already in the URL
        url = `${this.config.serverProxyUrl}/chat/completions`;
      } else if (isThingproxy) {
        // For thingproxy, the target is already in the URL
        url = `${this.config.serverProxyUrl}/chat/completions`;
      } else if (isVercel) {
        // For Vercel deployment
        url = `${this.config.serverProxyUrl}/api/openai/chat/completions`;
      } else {
        // Default behavior for direct or unknown proxies
        url = `${this.config.serverProxyUrl}/api/openai/chat/completions`;
      }
      
      GPTLogger.log(requestId, `Constructed request URL: ${url}`);
      GPTLogger.log(requestId, `Using headers: ${JSON.stringify(headers)}`);
      
      const response = await fetch(url, {
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
   * Implement exponential backoff for retries
   */
  private async backoff(requestId: string, retryCount: number): Promise<void> {
    const backoffTime = Math.min(1000 * Math.pow(2, retryCount), 10000);
    GPTLogger.log(requestId, `Backing off for ${backoffTime}ms before retry`);
    await new Promise(resolve => setTimeout(resolve, backoffTime));
  }
}
