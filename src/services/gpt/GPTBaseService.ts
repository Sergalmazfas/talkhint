
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
  saveServerProxyUrlToStorage,
  loadDebugModeFromStorage,
  saveDebugModeToStorage,
  isValidApiKey
} from './config/GPTServiceConfig';
import { GPTRequestService } from './utils/GPTRequestService';
import { GPTLogger } from './utils/GPTLogger';
import { GPTClientFactory } from './utils/GPTClientFactory';
import { toast } from "sonner";

/**
 * Base service that handles API key management and core OpenAI API functionality
 */
class GPTBaseService {
  protected config: GPTServiceConfig;
  protected requestService: GPTRequestService;

  constructor() {
    // Initialize with default config
    this.config = { ...DEFAULT_CONFIG };
    
    // Try to load settings from localStorage on initialization
    this.loadSettingsFromStorage();
    
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
      if (isValidApiKey(storedKey)) {
        this.config.apiKey = storedKey;
        GPTLogger.log(undefined, `API key loaded from storage: ${storedKey.substring(0, 5)}...${storedKey.slice(-5)}`);
      } else {
        GPTLogger.warn(undefined, `Invalid API key format found in storage: ${storedKey.substring(0, 3)}...`);
        this.config.apiKey = null;
      }
    } else {
      this.config.apiKey = null;
      GPTLogger.log(undefined, 'No API key found in storage');
    }
    
    // Load proxy setting
    const useServerProxy = loadUseServerProxyFromStorage();
    if (useServerProxy !== null) {
      this.config.useServerProxy = useServerProxy;
      GPTLogger.log(undefined, `Server proxy setting loaded from storage: ${useServerProxy}`);
    }
    
    // Load server proxy URL
    const serverProxyUrl = loadServerProxyUrlFromStorage();
    if (serverProxyUrl) {
      this.config.serverProxyUrl = serverProxyUrl;
      GPTLogger.log(undefined, `Server proxy URL loaded from storage: ${serverProxyUrl}`);
    }
    
    // Load response style
    const responseStyle = loadResponseStyleFromStorage();
    if (responseStyle) {
      this.config.responseStyle = responseStyle;
      GPTLogger.log(undefined, `Response style loaded from storage: ${responseStyle}`);
    }
    
    // Load debug mode
    const debugMode = loadDebugModeFromStorage();
    if (debugMode !== null) {
      this.config.debugMode = debugMode;
      GPTLogger.log(undefined, `Debug mode loaded from storage: ${debugMode}`);
    }
  }

  /**
   * Log current configuration
   */
  private logConfiguration(): void {
    GPTLogger.log(undefined, `API key status: ${this.config.apiKey ? 'Set' : 'Not set'}`);
    if (this.config.apiKey) {
      GPTLogger.log(undefined, `API key format: ${this.config.apiKey.substring(0, 5)}...${this.config.apiKey.slice(-5)}`);
    }
    GPTLogger.log(undefined, `Server proxy usage: ${this.config.useServerProxy}`);
    GPTLogger.log(undefined, `Response style: ${this.config.responseStyle}`);
    GPTLogger.log(undefined, `Server proxy URL: ${this.config.serverProxyUrl}`);
    GPTLogger.log(undefined, `Debug mode: ${this.config.debugMode}`);
  }

  /**
   * Get a configured OpenAI client instance
   * Returns null if no API key is set
   */
  public getOpenAIClient(): OpenAI | null {
    return GPTClientFactory.createClient(this.config);
  }

  /**
   * Set the API key and validate its format
   */
  public setApiKey(key: string): boolean {
    if (!key || key.trim() === '') {
      GPTLogger.warn(undefined, 'Attempted to set empty API key');
      toast.warning('API ключ не может быть пустым');
      return false;
    }
    
    // Validate key format
    if (!isValidApiKey(key)) {
      GPTLogger.warn(undefined, `Invalid API key format: ${key.substring(0, 3)}...`);
      toast.error('Неверный формат API ключа. Ключ должен начинаться с "sk-"');
      return false;
    }
    
    this.config.apiKey = key.trim();
    saveApiKeyToStorage(key.trim());
    this.requestService.updateConfig(this.config);
    GPTLogger.log(undefined, `API key set and saved to storage: ${key.substring(0, 5)}...${key.slice(-5)}`);
    toast.success('API ключ успешно сохранен');
    return true;
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
    this.config.useServerProxy = use;
    saveUseServerProxyToStorage(use);
    this.requestService.updateConfig(this.config);
    GPTLogger.log(undefined, `Server proxy usage set to: ${use}`);
    toast.success(use ? 'Использование прокси-сервера включено' : 'Прямое подключение к API включено');
  }
  
  public getUseServerProxy(): boolean {
    return this.config.useServerProxy;
  }
  
  /**
   * Set the server proxy URL
   */
  public setServerProxyUrl(url: string) {
    if (!url || url.trim() === '') {
      GPTLogger.warn(undefined, 'Attempted to set empty server proxy URL');
      toast.warning('URL прокси-сервера не может быть пустым');
      return;
    }
    
    this.config.serverProxyUrl = url;
    saveServerProxyUrlToStorage(url);
    this.requestService.updateConfig(this.config);
    GPTLogger.log(undefined, `Server proxy URL set to: ${url}`);
    toast.success(`URL прокси-сервера установлен: ${url.substring(0, 30)}${url.length > 30 ? '...' : ''}`);
  }
  
  /**
   * Get the server proxy URL
   */
  public getServerProxyUrl(): string {
    return this.config.serverProxyUrl;
  }
  
  /**
   * Set debug mode
   */
  public setDebugMode(enabled: boolean) {
    this.config.debugMode = enabled;
    saveDebugModeToStorage(enabled);
    GPTLogger.log(undefined, `Debug mode set to: ${enabled}`);
  }
  
  /**
   * Get debug mode setting
   */
  public getDebugMode(): boolean {
    return this.config.debugMode;
  }

  /**
   * Send a simple message to the chat API on lovable.dev
   */
  public async sendChatMessage(message: string): Promise<any> {
    try {
      return await this.requestService.makeSimpleChatRequest(message);
    } catch (error) {
      console.error('Error sending chat message:', error);
      toast.error('Ошибка при отправке сообщения');
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
    
    // For direct connection, we need an API key
    if (!this.config.apiKey) {
      GPTLogger.error(undefined, 'Cannot check API connection: API key is missing');
      toast.error('Для проверки соединения необходим API ключ');
      return false;
    }
    
    // Validate API key format
    if (!isValidApiKey(this.config.apiKey)) {
      GPTLogger.error(undefined, 'Cannot check API connection: API key format is invalid');
      toast.error('Неверный формат API ключа');
      return false;
    }
    
    // Try direct connection with API key
    try {
      // Use a minimalist test request
      const testPrompt = [{ role: 'user', content: 'Test' }];
      const result = await this.callOpenAI(testPrompt, 0.1, 5);
      GPTLogger.log(undefined, 'API connection check successful');
      return !!result;
    } catch (error) {
      GPTLogger.error(undefined, 'API connection check failed', error);
      
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('401') || errorMessage.includes('unauthorized') || errorMessage.includes('api key')) {
          toast.error('Неверный API ключ');
        } else if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
          toast.error('Превышен лимит запросов к API');
        } else {
          toast.error(`Ошибка API: ${error.message.substring(0, 50)}`);
        }
      }
      
      return false;
    }
  }

  protected async callOpenAI(messages: any[], temperature: number = 1.0, maxTokens: number = 150, n: number = 1): Promise<any> {
    return this.requestService.callOpenAI(messages, temperature, maxTokens, n);
  }
}

export default GPTBaseService;
