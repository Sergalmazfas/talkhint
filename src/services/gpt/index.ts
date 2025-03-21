
import GPTBaseService from './GPTBaseService';
import GPTSuggestionsService from './GPTSuggestionsService';
import GPTBilingualService from './GPTBilingualService';
import GPTTranslationService from './GPTTranslationService';
import { GPTResponse, BilingualResponse, TranslationResponse } from './GPTMocks';
import { toast } from "sonner";
import OpenAI from "openai";

/**
 * Main GPT service that combines all the specialized services
 */
class GPTService {
  private suggestionsService: GPTSuggestionsService;
  private bilingualService: GPTBilingualService;
  private translationService: GPTTranslationService;

  constructor() {
    console.log(`[${new Date().toISOString()}] Initializing GPTService with specialized services`);
    this.suggestionsService = new GPTSuggestionsService();
    this.bilingualService = new GPTBilingualService();
    this.translationService = new GPTTranslationService();
    console.log(`[${new Date().toISOString()}] GPT service initialization complete`);
  }

  /**
   * Get a configured OpenAI client instance for direct API calls
   * Returns null if no API key is set
   */
  public getOpenAIClient(): OpenAI | null {
    return this.suggestionsService.getOpenAIClient();
  }

  public setApiKey(key: string): void {
    console.log(`[${new Date().toISOString()}] Setting API key for all services`);
    this.suggestionsService.setApiKey(key);
    this.bilingualService.setApiKey(key);
    this.translationService.setApiKey(key);
    console.log(`[${new Date().toISOString()}] API key set for all services`);
  }

  public getApiKey(): string | null {
    return this.suggestionsService.getApiKey();
  }

  public setUseServerProxy(use: boolean): void {
    console.log(`[${new Date().toISOString()}] Setting server proxy mode: ${use}`);
    this.suggestionsService.setUseServerProxy(use);
    this.bilingualService.setUseServerProxy(use);
    this.translationService.setUseServerProxy(use);
    console.log(`[${new Date().toISOString()}] Server proxy mode set for all services`);
    
    // Show a notification to the user
    toast(use ? "Используется прокси-сервер для API" : "Используется прямое подключение к API");
  }

  public getUseServerProxy(): boolean {
    return this.suggestionsService.getUseServerProxy();
  }
  
  /**
   * Set the server proxy URL for all services
   */
  public setServerProxyUrl(url: string): void {
    console.log(`[${new Date().toISOString()}] Setting server proxy URL: ${url}`);
    this.suggestionsService.setServerProxyUrl(url);
    this.bilingualService.setServerProxyUrl(url);
    this.translationService.setServerProxyUrl(url);
    console.log(`[${new Date().toISOString()}] Server proxy URL set for all services`);
  }
  
  /**
   * Get the server proxy URL
   */
  public getServerProxyUrl(): string {
    return this.suggestionsService.getServerProxyUrl();
  }

  /**
   * Set server-only mode for all services
   */
  public setServerOnly(enabled: boolean): void {
    console.log(`[${new Date().toISOString()}] Setting server-only mode: ${enabled}`);
    this.suggestionsService.setServerOnly(enabled);
    this.bilingualService.setServerOnly(enabled);
    this.translationService.setServerOnly(enabled);
    console.log(`[${new Date().toISOString()}] Server-only mode set for all services`);
    
    toast(enabled ? "API ключ хранится только на сервере" : "API ключ может храниться локально");
  }
  
  /**
   * Get server-only mode 
   */
  public getServerOnly(): boolean {
    return this.suggestionsService.getServerOnly();
  }

  public setResponseStyle(style: string): void {
    console.log(`[${new Date().toISOString()}] Setting response style: ${style}`);
    this.suggestionsService.setResponseStyle(style);
  }

  /**
   * Get the response style
   */
  public getResponseStyle(): string {
    return this.suggestionsService.getResponseStyle();
  }

  /**
   * Send a direct message to the lovable.dev chat API
   */
  public async sendChatMessage(message: string): Promise<any> {
    console.log(`[${new Date().toISOString()}] Sending chat message to lovable.dev API: ${message}`);
    try {
      const result = await this.suggestionsService.sendChatMessage(message);
      console.log(`[${new Date().toISOString()}] Chat response received:`, result);
      return result;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error in sendChatMessage:`, error);
      throw error;
    }
  }

  public async checkConnection(): Promise<boolean> {
    console.log(`[${new Date().toISOString()}] Checking GPT API connection`);
    
    try {
      return await this.bilingualService.checkApiConnection();
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error checking connection:`, error);
      return false;
    }
  }

  public async getSuggestions(transcription: string): Promise<GPTResponse> {
    console.log(`[${new Date().toISOString()}] GPTService: getSuggestions called with ${transcription.length} chars`);
    const startTime = Date.now();
    try {
      const result = await this.suggestionsService.getSuggestions(transcription);
      const endTime = Date.now();
      console.log(`[${new Date().toISOString()}] GPTService: suggestions received in ${endTime - startTime}ms:`, result);
      return result;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] GPTService: error in getSuggestions:`, error);
      throw error;
    }
  }

  public async getBilingualResponses(transcription: string): Promise<BilingualResponse> {
    console.log(`[${new Date().toISOString()}] GPTService: getBilingualResponses called with ${transcription.length} chars`);
    const startTime = Date.now();
    try {
      const result = await this.bilingualService.getBilingualResponses(transcription);
      const endTime = Date.now();
      console.log(`[${new Date().toISOString()}] GPTService: bilingual responses received in ${endTime - startTime}ms:`, result);
      return result;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] GPTService: error in getBilingualResponses:`, error);
      throw error;
    }
  }

  public async getTranslation(
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<TranslationResponse> {
    console.log(`[${new Date().toISOString()}] GPTService: getTranslation called for ${sourceLanguage} to ${targetLanguage} with ${text.length} chars`);
    const startTime = Date.now();
    try {
      const result = await this.translationService.getTranslation(text, sourceLanguage, targetLanguage);
      const endTime = Date.now();
      console.log(`[${new Date().toISOString()}] GPTService: translation received in ${endTime - startTime}ms:`, result);
      return result;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] GPTService: error in getTranslation:`, error);
      throw error;
    }
  }
}

// Export a singleton instance
const gptServiceInstance = new GPTService();
console.log(`[${new Date().toISOString()}] GPT service singleton instance created`);

export default gptServiceInstance;

// Also export the interfaces for use in other components
export type { GPTResponse, BilingualResponse, TranslationResponse };
