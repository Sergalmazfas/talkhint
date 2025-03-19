
import OpenAI from "openai";
import { GPTLogger } from "./GPTLogger";
import { GPTServiceConfig } from "../config/GPTServiceConfig";

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
   * Initialize the OpenAI client with the current API key
   */
  public initializeOpenAIClient(): void {
    if (this.config.apiKey) {
      this.openaiClient = new OpenAI({
        apiKey: this.config.apiKey,
        dangerouslyAllowBrowser: true, // Required for client-side usage
      });
      GPTLogger.log(undefined, 'OpenAI client initialized');
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
    GPTLogger.log(requestId, 'Using model: gpt-4o-mini');
    
    const requestPayload = {
      model: 'gpt-4o-mini',
      messages,
      temperature,
      max_tokens: maxTokens,
      n
    };
    
    GPTLogger.log(requestId, 'Request payload:', requestPayload);

    let currentRetry = 0;
    
    while (currentRetry <= this.config.maxRetries) {
      if (currentRetry > 0) {
        GPTLogger.log(requestId, `Retry attempt ${currentRetry}/${this.config.maxRetries}`);
      }
      
      const startTime = Date.now();
      try {
        let response;
        
        if (this.config.useServerProxy) {
          response = await this.makeServerProxyRequest(requestId, requestPayload);
        } else {
          response = await this.makeDirectOpenAIRequest(requestId, messages, temperature, maxTokens, n);
        }

        const endTime = Date.now();
        const duration = endTime - startTime;
        GPTLogger.log(requestId, `API request completed in ${duration}ms`);
        
        GPTLogger.log(requestId, 'Response successfully processed');
        GPTLogger.log(requestId, `Response object structure:`, Object.keys(response));
        
        if (response.choices && response.choices.length > 0) {
          GPTLogger.log(requestId, `Sample response content: "${response.choices[0].message.content?.substring(0, 50)}..."`);
        }
        
        return response;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        GPTLogger.error(requestId, 'Error in API request:', errorMessage);
        
        // Check if it's an abort error (timeout)
        if (errorMessage.includes('abort') || errorMessage.includes('timeout')) {
          GPTLogger.warn(requestId, `Request timed out after ${this.config.timeoutMs}ms`);
          
          if (currentRetry < this.config.maxRetries) {
            await this.backoff(requestId, currentRetry);
            currentRetry++;
            continue;
          }
        }
        
        // For other errors, retry
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
   * Make a request using the server proxy
   */
  private async makeServerProxyRequest(requestId: string, requestPayload: any): Promise<any> {
    GPTLogger.log(requestId, `Sending request using server proxy: ${this.config.serverProxyUrl}`);
    
    // Create a controller for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      GPTLogger.log(requestId, `Request timed out after ${this.config.timeoutMs}ms`);
      controller.abort();
    }, this.config.timeoutMs);
    
    // Log the origin being used
    const origin = window.location.origin;
    GPTLogger.log(requestId, `Using origin: ${origin}`);
    
    // Update the endpoint to specifically use /v1/chat/completions
    const response = await fetch(`${this.config.serverProxyUrl}/v1/chat/completions`, {
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
      GPTLogger.error(requestId, `Server proxy error: ${response.status} ${errorText}`);
      throw new Error(`Server proxy error: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    GPTLogger.log(requestId, 'Server proxy response received:', data);
    return data;
  }

  /**
   * Make a direct request to OpenAI API
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
