
/**
 * Configuration for OpenAI API services
 */
export interface GPTServiceConfig {
  apiKey: string | null;
  responseStyle: string;
  serverProxyUrl: string;
  useServerProxy: boolean;
  maxRetries: number;
  timeoutMs: number;
}

/**
 * Default configuration for OpenAI API services
 */
export const DEFAULT_CONFIG: GPTServiceConfig = {
  apiKey: null,
  responseStyle: 'casual',
  serverProxyUrl: 'https://cors-anywhere-lyart-seven.vercel.app', // Vercel deployment URL
  useServerProxy: true, // Flag to toggle between server proxy and direct API
  maxRetries: 3,
  timeoutMs: 60000,
};

/**
 * Load the OpenAI API key from localStorage
 */
export function loadApiKeyFromStorage(): string | null {
  const storedKey = localStorage.getItem('openai_api_key');
  return storedKey || null;
}

/**
 * Save the OpenAI API key to localStorage
 */
export function saveApiKeyToStorage(key: string): void {
  localStorage.setItem('openai_api_key', key);
}
