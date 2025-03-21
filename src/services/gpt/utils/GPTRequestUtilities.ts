
import { GPTLogger } from "./GPTLogger";

/**
 * Utility methods for request handling
 */
export class RequestUtilities {
  /**
   * Helper method to ensure URL is valid
   */
  public static ensureValidUrl(url: string): string {
    // If URL doesn't start with http(s), assume https
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }
    return url;
  }

  /**
   * Helper method to ensure endpoint path is correctly appended
   */
  public static ensureEndpoint(baseUrl: string, endpoint: string): string {
    // Remove trailing slash from base URL if any
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    
    // Ensure endpoint starts with slash
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    // Check if endpoint is already in the URL
    if (cleanBaseUrl.endsWith(cleanEndpoint)) {
      return cleanBaseUrl;
    }
    
    // Check if we need to add /api before the endpoint
    if (!cleanBaseUrl.endsWith('/api') && !cleanEndpoint.startsWith('/api/')) {
      return `${cleanBaseUrl}/api${cleanEndpoint}`;
    }
    
    return `${cleanBaseUrl}${cleanEndpoint}`;
  }

  /**
   * Implement exponential backoff for retries
   */
  public static async backoff(requestId: string, retryCount: number): Promise<void> {
    const backoffTime = Math.min(1000 * Math.pow(2, retryCount), 10000);
    GPTLogger.log(requestId, `Backing off for ${backoffTime}ms before retry`);
    await new Promise(resolve => setTimeout(resolve, backoffTime));
  }
  
  /**
   * Basic validation of API key format
   */
  public static isValidApiKeyFormat(apiKey: string): boolean {
    const isValid = apiKey.trim().startsWith('sk-') && apiKey.trim().length > 20;
    console.log('[API_KEY_DEBUG] API key format validation:', isValid);
    return isValid;
  }
}
