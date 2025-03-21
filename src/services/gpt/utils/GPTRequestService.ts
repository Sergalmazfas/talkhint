
import OpenAI from "openai";
import { GPTLogger } from "./GPTLogger";
import { GPTServiceConfig } from "../config/GPTServiceConfig";
import { RequestUtilities } from "./GPTRequestUtilities";
import { DirectRequestHandler } from "./GPTDirectRequestHandler";
import { ProxyRequestHandler } from "./GPTProxyRequestHandler";
import { GPTClientFactory } from "./GPTClientFactory";

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
        // Validate API key format to catch obvious errors
        if (!RequestUtilities.isValidApiKeyFormat(this.config.apiKey)) {
          GPTLogger.warn(undefined, 'API key has invalid format - should start with "sk-"');
          console.warn('[API_KEY_DEBUG] API key has invalid format:', this.config.apiKey.substring(0, 3) + '...');
          this.openaiClient = null;
          return;
        }
        
        this.openaiClient = GPTClientFactory.createClient(this.config);
        
        if (this.openaiClient) {
          GPTLogger.log(undefined, 'OpenAI client initialized');
          console.log('[API_KEY_DEBUG] OpenAI client initialized with key:', this.config.apiKey.substring(0, 5) + '...' + this.config.apiKey.slice(-5));
        } else {
          GPTLogger.error(undefined, 'Failed to create OpenAI client');
        }
      } catch (error) {
        GPTLogger.error(undefined, 'Failed to initialize OpenAI client:', error);
        console.error('[API_KEY_DEBUG] Failed to initialize OpenAI client:', error);
        this.openaiClient = null;
      }
    } else {
      this.openaiClient = null;
      GPTLogger.log(undefined, 'OpenAI client not initialized: missing API key');
      console.warn('[API_KEY_DEBUG] OpenAI client not initialized: missing API key');
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
    
    // Check if we have a valid API key when needed
    if (!this.config.useServerProxy) {
      if (!this.config.apiKey || this.config.apiKey.trim() === '') {
        const errorMsg = 'API key is required for direct OpenAI access';
        GPTLogger.error(requestId, errorMsg);
        throw new Error(errorMsg);
      } 
      
      if (!RequestUtilities.isValidApiKeyFormat(this.config.apiKey)) {
        const errorMsg = 'Invalid API key format. API key should start with "sk-"';
        GPTLogger.error(requestId, errorMsg);
        throw new Error(errorMsg);
      }
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
          response = await ProxyRequestHandler.makeProxyRequest(this.config, requestId, requestPayload);
        } else {
          // Direct API access with OpenAI SDK
          response = await DirectRequestHandler.makeDirectOpenAIRequest(
            this.openaiClient, 
            this.config, 
            requestId, 
            messages, 
            temperature, 
            maxTokens, 
            n
          );
        }

        const endTime = Date.now();
        const duration = endTime - startTime;
        GPTLogger.log(requestId, `API request completed in ${duration}ms`);
        
        return response;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        GPTLogger.error(requestId, 'Error in API request:', errorMessage);
        
        // Don't retry authentication errors
        if (errorMessage.includes('401') || errorMessage.includes('API key')) {
          throw new Error(`Authentication error: ${errorMessage}. Please check that your API key is valid.`);
        }
        
        // Check if it's a timeout
        if (errorMessage.includes('abort') || errorMessage.includes('timeout')) {
          GPTLogger.warn(requestId, `Request timed out after ${this.config.timeoutMs}ms`);
          
          if (currentRetry < this.config.maxRetries) {
            await RequestUtilities.backoff(requestId, currentRetry);
            currentRetry++;
            continue;
          }
        }
        
        // For other errors, retry if possible
        if (currentRetry < this.config.maxRetries) {
          await RequestUtilities.backoff(requestId, currentRetry);
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
    return ProxyRequestHandler.makeSimpleChatRequest(this.config, message);
  }
}
