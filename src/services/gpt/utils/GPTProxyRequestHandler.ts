
import { GPTServiceConfig } from "../config/GPTServiceConfig";
import { GPTLogger } from "./GPTLogger";
import { RequestUtilities } from "./GPTRequestUtilities";

/**
 * Handles proxy requests to OpenAI API through a proxy server
 */
export class ProxyRequestHandler {
  /**
   * Make a proxy request using the server proxy service
   */
  public static async makeProxyRequest(
    config: GPTServiceConfig,
    requestId: string, 
    requestPayload: any
  ): Promise<any> {
    GPTLogger.log(requestId, `Making request via server proxy: ${config.serverProxyUrl}`);
    console.log('[API_KEY_DEBUG] Making proxy request to:', config.serverProxyUrl);
    
    // Create a controller for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      GPTLogger.log(requestId, `Request timed out after ${config.timeoutMs}ms`);
      controller.abort();
    }, config.timeoutMs);
    
    try {
      // Properly construct the API URL
      const baseUrl = RequestUtilities.ensureValidUrl(config.serverProxyUrl);
      
      // When using our own server/proxy, we should send requests to the /openai/chat/completions endpoint
      const apiUrl = RequestUtilities.ensureEndpoint(baseUrl, '/openai/chat/completions');
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Origin': window.location.origin,
        'Accept': 'application/json'
      };
      
      // Only add Authorization header if API key is set, valid, and not empty
      // When using our own server, this is optional as the server should use its own API key
      if (config.apiKey && config.apiKey.trim() !== '') {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
        GPTLogger.log(requestId, 'Using provided API key for authorization');
        console.log('[API_KEY_DEBUG] Using provided API key in proxy request:', config.apiKey.substring(0, 5) + '...' + config.apiKey.slice(-5));
      } else {
        // When using our own proxy, we'll let the server use its own API key
        GPTLogger.log(requestId, 'No API key provided in request, server should use its own API key');
        console.log('[API_KEY_DEBUG] No API key provided for proxy request - server should use its own key');
      }
      
      GPTLogger.log(requestId, `Constructed request URL: ${apiUrl}`);
      GPTLogger.log(requestId, `Request headers: ${JSON.stringify(headers, (key, value) => 
        key === 'Authorization' ? (value ? 'Bearer [KEY SET]' : value) : value)}`);
      
      console.log('[API_KEY_DEBUG] Constructed request URL:', apiUrl);
      console.log('[API_KEY_DEBUG] Request payload:', JSON.stringify(requestPayload).substring(0, 200) + '...');
      console.log('[API_KEY_DEBUG] Request headers:', JSON.stringify(headers, (key, value) => 
        key === 'Authorization' ? (value ? 'Bearer [KEY SET]' : value) : value));
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
        mode: 'cors',
        credentials: 'include'  // Include credentials when using our own server
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        let errorMessage = `API error: ${response.status}`;
        let errorDetails = '';
        
        try {
          const errorData = await response.json();
          errorDetails = JSON.stringify(errorData);
          console.error('[API_KEY_DEBUG] Server error response:', errorData);
        } catch (e) {
          const errorText = await response.text();
          errorDetails = errorText;
          console.error('[API_KEY_DEBUG] Server error text:', errorText);
        }
        
        errorMessage += ` ${errorDetails}`;
        GPTLogger.error(requestId, errorMessage);
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      GPTLogger.log(requestId, 'API response received successfully');
      console.log('[API_KEY_DEBUG] Proxy request successful with response');
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('[API_KEY_DEBUG] Error in makeProxyRequest:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Make a simple chat request to the server
   */
  public static async makeSimpleChatRequest(config: GPTServiceConfig, message: string): Promise<any> {
    const requestId = Date.now().toString(36);
    GPTLogger.log(requestId, `Making simple chat request with message: ${message.substring(0, 30)}...`);
    
    try {
      // Properly construct the URL with domain and path
      const baseUrl = RequestUtilities.ensureValidUrl(config.serverProxyUrl);
      const chatUrl = RequestUtilities.ensureEndpoint(baseUrl, '/chat');
      
      GPTLogger.log(requestId, `Using chat URL: ${chatUrl}`);
      console.log('[API_KEY_DEBUG] Making simple chat request to URL:', chatUrl);
      
      const response = await fetch(chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin,
          'Accept': 'application/json'
        },
        body: JSON.stringify({ message }),
        mode: 'cors', // Explicitly set CORS mode
        credentials: 'omit' // Don't send cookies for cross-origin requests
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[API_KEY_DEBUG] Chat API error:', response.status, errorText);
        throw new Error(`Chat API error (${response.status}): ${errorText}`);
      }
      
      const data = await response.json();
      GPTLogger.log(requestId, 'Chat response received successfully');
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      GPTLogger.error(requestId, 'Error in makeSimpleChatRequest:', errorMessage);
      console.error('[API_KEY_DEBUG] Error in makeSimpleChatRequest:', errorMessage);
      
      // Fallback to a mock response if the server is unavailable
      GPTLogger.log(requestId, 'Returning mock response as fallback');
      console.warn('[API_KEY_DEBUG] Returning mock response as fallback due to error');
      return {
        success: true,
        received: message,
        response: `Mock response for: "${message}" (server unavailable)`,
        timestamp: new Date().toISOString()
      };
    }
  }
}
