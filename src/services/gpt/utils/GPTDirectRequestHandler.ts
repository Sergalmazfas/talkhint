
import OpenAI from "openai";
import { GPTServiceConfig } from "../config/GPTServiceConfig";
import { GPTLogger } from "./GPTLogger";

/**
 * Handles direct requests to OpenAI API using the OpenAI SDK
 */
export class DirectRequestHandler {
  /**
   * Make a direct request to OpenAI API using the SDK
   */
  public static async makeDirectOpenAIRequest(
    client: OpenAI | null,
    config: GPTServiceConfig,
    requestId: string, 
    messages: any[], 
    temperature: number, 
    maxTokens: number, 
    n: number
  ): Promise<any> {
    GPTLogger.log(requestId, 'Sending request using OpenAI SDK');
    
    if (!client) {
      throw new Error('Failed to initialize OpenAI client');
    }
    
    // Create a controller for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      GPTLogger.log(requestId, `Request timed out after ${config.timeoutMs}ms`);
      controller.abort();
    }, config.timeoutMs);
    
    try {
      // Using the OpenAI SDK
      const completion = await client.chat.completions.create({
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
}
