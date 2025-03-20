
import OpenAI from "openai";
import { 
  GPTServiceConfig, 
  DEFAULT_CONFIG, 
  loadApiKeyFromStorage, 
  saveApiKeyToStorage,
  loadUseServerProxyFromStorage,
  saveUseServerProxyToStorage 
} from './config/GPTServiceConfig';
import { GPTRequestService } from './utils/GPTRequestService';
import { GPTLogger } from './utils/GPTLogger';
import { GPTClientFactory } from './utils/GPTClientFactory';

/**
 * Base service that handles API key management and core OpenAI API functionality
 */
class GPTBaseService {
  protected config: GPTServiceConfig;
  protected requestService: GPTRequestService;

  constructor() {
    // Initialize with default config
    this.config = { ...DEFAULT_CONFIG };
    
    // Try to load API key from localStorage on initialization
    const storedKey = loadApiKeyFromStorage();
    if (storedKey) {
      this.config.apiKey = storedKey;
      GPTLogger.log(undefined, 'API key loaded from storage');
    } else {
      // No longer use the default API key if none is stored
      this.config.apiKey = null;
      GPTLogger.log(undefined, 'No API key found in storage');
    }
    
    // Try to load server proxy setting from localStorage
    const useServerProxy = loadUseServerProxyFromStorage();
    if (useServerProxy !== null) {
      this.config.useServerProxy = useServerProxy;
      GPTLogger.log(undefined, `Server proxy setting loaded from storage: ${useServerProxy}`);
    }
    
    // Initialize the request service
    this.requestService = new GPTRequestService(this.config);

    // Log server proxy status
    GPTLogger.log(undefined, `Server proxy usage initialized to: ${this.config.useServerProxy}`);
  }

  /**
   * Get a configured OpenAI client instance
   * Returns null if no API key is set
   */
  public getOpenAIClient(): OpenAI | null {
    return GPTClientFactory.createClient(this.config);
  }

  public setApiKey(key: string) {
    if (!key || key.trim() === '') {
      GPTLogger.warn(undefined, 'Attempted to set empty API key');
      return;
    }
    
    this.config.apiKey = key;
    saveApiKeyToStorage(key);
    this.requestService.initializeOpenAIClient();
    GPTLogger.log(undefined, 'API key set and saved to storage');
  }

  public getApiKey(): string | null {
    return this.config.apiKey;
  }

  public setResponseStyle(style: string) {
    this.config.responseStyle = style;
  }
  
  public getResponseStyle(): string {
    return this.config.responseStyle;
  }

  public setUseServerProxy(use: boolean) {
    this.config.useServerProxy = use;
    saveUseServerProxyToStorage(use);
    this.requestService.updateConfig(this.config);
    GPTLogger.log(undefined, `Server proxy usage set to: ${use}`);
  }
  
  public getUseServerProxy(): boolean {
    return this.config.useServerProxy;
  }

  /**
   * Send a simple message to the chat API on lovable.dev
   */
  public async sendChatMessage(message: string): Promise<any> {
    try {
      return await this.requestService.makeSimpleChatRequest(message);
    } catch (error) {
      console.error('Error sending chat message:', error);
      throw error;
    }
  }

  public async checkApiConnection(): Promise<boolean> {
    GPTLogger.log(undefined, 'Checking GPT API connection');
    
    // Always consider connection successful when using the proxy
    if (this.config.useServerProxy) {
      GPTLogger.log(undefined, 'Using proxy service - assuming connection is valid');
      return true;
    }
    
    // Try direct connection with API key
    if (this.config.apiKey) {
      try {
        // Use a simple test prompt
        const testPrompt = [{ role: 'user', content: 'Connection check' }];
        const result = await this.callOpenAI(testPrompt, 0.1, 10);
        return !!result;
      } catch (error) {
        GPTLogger.error(undefined, 'API connection check failed', error);
        return false;
      }
    }
    
    // If we don't have an API key and aren't using proxy
    return false;
  }

  protected async callOpenAI(messages: any[], temperature: number = 1.0, maxTokens: number = 150, n: number = 1): Promise<any> {
    return this.requestService.callOpenAI(messages, temperature, maxTokens, n);
  }
}

export default GPTBaseService;
