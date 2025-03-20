
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
  private connectionCheckCache: {
    timestamp: number;
    status: boolean;
  } | null = null;

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
    
    // Reset connection check cache when API key changes
    this.connectionCheckCache = null;
    
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
    
    // Reset connection check cache when proxy URL changes
    this.connectionCheckCache = null;
    
    // Make sure URL has correct format (has protocol)
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      // Default to https if no protocol specified
      formattedUrl = 'https://' + formattedUrl;
      GPTLogger.log(undefined, `Added HTTPS protocol to URL: ${formattedUrl}`);
    }
    
    // Remove trailing slash if present
    if (formattedUrl.endsWith('/')) {
      formattedUrl = formattedUrl.slice(0, -1);
      GPTLogger.log(undefined, `Removed trailing slash from URL: ${formattedUrl}`);
    }
    
    this.config.serverProxyUrl = formattedUrl;
    saveServerProxyUrlToStorage(formattedUrl);
    this.requestService.updateConfig(this.config);
    GPTLogger.log(undefined, `Server proxy URL set to: ${formattedUrl}`);
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

  /**
   * Check connection to the API server
   * Added caching to prevent too many requests
   */
  public async checkConnection(): Promise<boolean> {
    const requestId = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    GPTLogger.log(requestId, 'Checking connection to API server');
    
    // Check cache first (valid for 30 seconds)
    const CACHE_TTL = 30 * 1000; // 30 seconds
    if (this.connectionCheckCache && 
        (Date.now() - this.connectionCheckCache.timestamp) < CACHE_TTL) {
      GPTLogger.log(requestId, `Using cached connection status: ${this.connectionCheckCache.status}`);
      return this.connectionCheckCache.status;
    }
    
    try {
      // First try the health endpoint
      const healthUrl = `${this.config.serverProxyUrl}/health`;
      GPTLogger.log(requestId, `Testing health endpoint: ${healthUrl}`);
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch(healthUrl, {
          method: 'GET',
          headers: {
            'Origin': window.location.origin,
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          mode: 'cors',
          credentials: 'omit',
          redirect: 'follow',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const result = await response.json();
          GPTLogger.log(requestId, `Health check succeeded: ${JSON.stringify(result)}`);
          
          this.connectionCheckCache = {
            timestamp: Date.now(),
            status: true
          };
          
          return true;
        }
      } catch (healthError) {
        GPTLogger.warn(requestId, `Health check failed: ${String(healthError)}`);
        // Continue to API check even if health check fails
      }
      
      // Use a minimalist test request as fallback
      GPTLogger.log(requestId, 'Attempting API test request');
      const testPrompt = [{ role: 'user', content: 'Test' }];
      const result = await this.callOpenAI(testPrompt, 0.1, 5);
      
      GPTLogger.log(requestId, 'API connection check successful');
      
      this.connectionCheckCache = {
        timestamp: Date.now(),
        status: !!result
      };
      
      return !!result;
    } catch (error) {
      GPTLogger.error(requestId, 'API connection check failed', error);
      
      this.connectionCheckCache = {
        timestamp: Date.now(),
        status: false
      };
      
      return false;
    }
  }

  protected async callOpenAI(messages: any[], temperature: number = 1.0, maxTokens: number = 150, n: number = 1): Promise<any> {
    return this.requestService.callOpenAI(messages, temperature, maxTokens, n);
  }
}

export default GPTBaseService;
