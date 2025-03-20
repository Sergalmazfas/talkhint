
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
  // Using Vercel-hosted server proxy as default
  serverProxyUrl: 'https://lovable-server.vercel.app', 
  useServerProxy: true, // Using server proxy by default
  maxRetries: 3,
  timeoutMs: 60000,
};

/**
 * Available proxy servers for CORS issues
 */
export const PROXY_SERVERS = {
  VERCEL: 'https://lovable-server.vercel.app',
  ALLORIGINS: 'https://api.allorigins.win/raw?url=https://api.openai.com/v1',
  CORSPROXY: 'https://corsproxy.io/?https://api.openai.com/v1',
  THINGPROXY: 'https://thingproxy.freeboard.io/fetch/https://api.openai.com/v1',
  LOCAL: 'http://localhost:3000',
  DIRECT: 'https://api.openai.com/v1',
};

/**
 * Load the OpenAI API key from localStorage
 */
export function loadApiKeyFromStorage(): string | null {
  try {
    const storedKey = localStorage.getItem('openai_api_key');
    return storedKey || null;
  } catch (error) {
    console.error('Error loading API key from storage:', error);
    return null;
  }
}

/**
 * Save the OpenAI API key to localStorage
 */
export function saveApiKeyToStorage(key: string): void {
  try {
    localStorage.setItem('openai_api_key', key);
  } catch (error) {
    console.error('Error saving API key to storage:', error);
  }
}

/**
 * Load the response style from localStorage
 */
export function loadResponseStyleFromStorage(): string | null {
  try {
    const style = localStorage.getItem('response_style');
    return style || null;
  } catch (error) {
    console.error('Error loading response style from storage:', error);
    return null;
  }
}

/**
 * Save the response style to localStorage
 */
export function saveResponseStyleToStorage(style: string): void {
  try {
    localStorage.setItem('response_style', style);
  } catch (error) {
    console.error('Error saving response style to storage:', error);
  }
}

/**
 * Load the server proxy setting from localStorage
 */
export function loadUseServerProxyFromStorage(): boolean | null {
  try {
    const useProxy = localStorage.getItem('use_server_proxy');
    return useProxy === null ? null : useProxy === 'true';
  } catch (error) {
    console.error('Error loading proxy setting from storage:', error);
    return null;
  }
}

/**
 * Save the server proxy setting to localStorage
 */
export function saveUseServerProxyToStorage(useProxy: boolean): void {
  try {
    localStorage.setItem('use_server_proxy', String(useProxy));
  } catch (error) {
    console.error('Error saving proxy setting to storage:', error);
  }
}

/**
 * Load the server proxy URL from localStorage
 */
export function loadServerProxyUrlFromStorage(): string | null {
  try {
    const proxyUrl = localStorage.getItem('server_proxy_url');
    return proxyUrl || null;
  } catch (error) {
    console.error('Error loading proxy URL from storage:', error);
    return null;
  }
}

/**
 * Save the server proxy URL to localStorage
 */
export function saveServerProxyUrlToStorage(url: string): void {
  try {
    localStorage.setItem('server_proxy_url', url);
  } catch (error) {
    console.error('Error saving proxy URL to storage:', error);
  }
}
