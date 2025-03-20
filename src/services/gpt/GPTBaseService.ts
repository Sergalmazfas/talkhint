
import OpenAI from "openai";
import { 
  GPTServiceConfig, 
  DEFAULT_CONFIG, 
  loadApiKeyFromStorage, 
  saveApiKeyToStorage,
  loadUseServerProxyFromStorage,
  saveUseServerProxyToStorage,
  loadResponseStyleFromStorage,
  saveResponseStyleToStorage,
  loadServerProxyUrlFromStorage,
  saveServerProxyUrlToStorage
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
    
    // Always use server proxy
    this.config.useServerProxy = true;
    
    // Try to load settings from localStorage on initialization
    this.loadSettingsFromStorage();
    
    // Ensure server proxy is always on
    this.config.useServerProxy = true;
    
    // Initialize the request service
    this.requestService = new GPTRequestService(this.config);

    // Log configuration
    this.logConfiguration();
  }

  /**
   * Load all settings from localStorage
   */
  private loadSettingsFromStorage(): void {
    // Load API key
    const storedKey = loadApiKeyFromStorage();
    if (storedKey) {
      this.config.apiKey = storedKey;
      GPTLogger.log(undefined, 'API key loaded from storage');
    } else {
      this.config.apiKey = null;
      GPTLogger.log(undefined, 'No API key found in storage');
    }
    
    // Load response style
    const responseStyle = loadResponseStyleFromStorage();
    if (responseStyle) {
      this.config.responseStyle = responseStyle;
      GPTLogger.log(undefined, `Response style loaded from storage: ${responseStyle}`);
    }
    
    // Load server proxy URL
    const serverProxyUrl = loadServerProxyUrlFromStorage();
    if (serverProxyUrl) {
      this.config.serverProxyUrl = serverProxyUrl;
      GPTLogger.log(undefined, `Server proxy URL loaded from storage: ${serverProxyUrl}`);
    }
    
    // We don't load the useServerProxy setting as we always want it to be true
    GPTLogger.log(undefined, 'Server proxy enforced: always enabled');
  }

  /**
   * Log current configuration
   */
  private logConfiguration(): void {
    GPTLogger.log(undefined, `API key status: ${this.config.apiKey ? 'Set' : 'Not set'}`);
    GPTLogger.log(undefined, `Server proxy usage: ${this.config.useServerProxy}`);
    GPTLogger.log(undefined, `Response style: ${this.config.responseStyle}`);
    GPTLogger.log(undefined, `Server proxy URL: ${this.config.serverProxyUrl}`);
  }

  /**
   * Get a configured OpenAI client instance
   * Always returns null when server proxy is enforced
   */
  public getOpenAIClient(): OpenAI | null {
    // When server proxy is enforced, we don't need an OpenAI client
    return null;
  }

  public setApiKey(key: string) {
    if (!key || key.trim() === '') {
      GPTLogger.warn(undefined, 'Attempted to set empty API key');
      return;
    }
    
    this.config.apiKey = key;
    saveApiKeyToStorage(key);
    this.requestService.updateConfig(this.config);
    GPTLogger.log(undefined, 'API key set and saved to storage');
  }

  public getApiKey(): string | null {
    return this.config.apiKey;
  }

  public setResponseStyle(style: string) {
    this.config.responseStyle = style;
    saveResponseStyleToStorage(style);
    GPTLogger.log(undefined, `Response style set to: ${style}`);
  }
  
  public getResponseStyle(): string {
    return this.config.responseStyle;
  }

  public setUseServerProxy(use: boolean) {
    // Always keep server proxy enabled regardless of the input
    this.config.useServerProxy = true;
    saveUseServerProxyToStorage(true);
    this.requestService.updateConfig(this.config);
    GPTLogger.log(undefined, `Server proxy usage enforced: always enabled`);
  }
  
  public getUseServerProxy(): boolean {
    return this.config.useServerProxy; // Always returns true
  }
  
  /**
   * Set the server proxy URL
   */
  public setServerProxyUrl(url: string) {
    if (!url || url.trim() === '') {
      GPTLogger.warn(undefined, 'Attempted to set empty server proxy URL');
      return;
    }
    
    this.config.serverProxyUrl = url;
    saveServerProxyUrlToStorage(url);
    this.requestService.updateConfig(this.config);
    GPTLogger.log(undefined, `Server proxy URL set to: ${url}`);
  }
  
  /**
   * Get the server proxy URL
   */
  public getServerProxyUrl(): string {
    return this.config.serverProxyUrl;
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
    
    try {
      // Use a minimalist test request
      const testPrompt = [{ role: 'user', content: 'Test' }];
      const result = await this.callOpenAI(testPrompt, 0.1, 5);
      GPTLogger.log(undefined, 'API connection check successful');
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
