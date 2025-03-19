
import OpenAI from "openai";
import { GPTServiceConfig } from "../config/GPTServiceConfig";
import { GPTLogger } from "./GPTLogger";

/**
 * Factory for creating configured OpenAI clients
 */
export class GPTClientFactory {
  /**
   * Create a configured OpenAI client
   */
  public static createClient(config: GPTServiceConfig): OpenAI | null {
    if (!config.apiKey) {
      GPTLogger.warn(undefined, 'Cannot create OpenAI client: API key is missing');
      return null;
    }
    
    try {
      const client = new OpenAI({
        apiKey: config.apiKey,
        dangerouslyAllowBrowser: true, // Required for client-side usage
      });
      
      GPTLogger.log(undefined, 'OpenAI client created successfully');
      return client;
    } catch (error) {
      GPTLogger.error(undefined, 'Failed to create OpenAI client', error);
      return null;
    }
  }
}
