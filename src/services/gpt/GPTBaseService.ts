
import OpenAI from "openai";
import { GPTServiceConfig, DEFAULT_CONFIG, loadApiKeyFromStorage, saveApiKeyToStorage } from './config/GPTServiceConfig';
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
    this.requestService.updateConfig(this.config);
    GPTLogger.log(undefined, `Server proxy usage set to: ${use}`);
  }
  
  public getUseServerProxy(): boolean {
    return this.config.useServerProxy;
  }

  public async checkApiConnection(): Promise<boolean> {
    // If no API key and not using proxy, return false immediately
    if (!this.config.apiKey && !this.config.useServerProxy) {
      GPTLogger.warn(undefined, 'API key not set and not using server proxy');
      return false;
    }
    
    try {
      // Use a simple test prompt
      const result = await this.callOpenAI([{ role: 'user', content: 'Connection check' }], 0.1, 10);
      return !!result;
    } catch (error) {
      GPTLogger.error(undefined, 'API connection check failed', error);
      return false;
    }
  }

  protected async callOpenAI(messages: any[], temperature: number = 1.0, maxTokens: number = 150, n: number = 1): Promise<any> {
    return this.requestService.callOpenAI(messages, temperature, maxTokens, n);
  }
}

export default GPTBaseService;
