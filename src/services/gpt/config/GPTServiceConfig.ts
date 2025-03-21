
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
  debugMode: boolean;
}

/**
 * Default configuration for OpenAI API services
 */
export const DEFAULT_CONFIG: GPTServiceConfig = {
  apiKey: null,
  responseStyle: 'casual',
  // Using our own server as default for better reliability
  serverProxyUrl: window.location.hostname.includes('localhost') 
    ? 'http://localhost:3000/api' 
    : (window.location.origin + '/api'),
  useServerProxy: true, // Default to proxy for better compatibility
  maxRetries: 3,
  timeoutMs: 60000,
  debugMode: true, // Enable debug mode by default for easier troubleshooting
};

/**
 * Available proxy servers
 */
export const PROXY_SERVERS = {
  // OpenAI direct
  DIRECT: 'https://api.openai.com/v1',
  // Our own server
  SELF_HOSTED: window.location.origin + '/api',
  // Vercel proxy
  VERCEL_PROXY: 'https://talkhint-sergs-projects-149ff317.vercel.app/api',
  // VSL proxy (more stable alternative)
  VSL_PROXY: 'https://vsl-proxy.vercel.app/api',
  // Local development
  LOCAL: 'http://localhost:3000/api',
};

// Storage key constants for better consistency
export const STORAGE_KEYS = {
  API_KEY: 'openai_api_key',
  RESPONSE_STYLE: 'response_style',
  USE_SERVER_PROXY: 'use_server_proxy',
  SERVER_PROXY_URL: 'server_proxy_url',
  DEBUG_MODE: 'debug_mode'
};

/**
 * Load the OpenAI API key from localStorage
 */
export function loadApiKeyFromStorage(): string | null {
  try {
    const storedKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
    console.log('[API_KEY_DEBUG] Loading API key from storage:', storedKey ? `${storedKey.substring(0, 5)}...${storedKey.slice(-5)}` : 'No key found');
    
    // Validate key format if exists
    if (storedKey && !storedKey.startsWith('sk-')) {
      console.warn('[API_KEY_DEBUG] Stored API key has invalid format:', storedKey.substring(0, 3) + '...');
      return null;
    }
    
    return storedKey || null;
  } catch (error) {
    console.error('[API_KEY_DEBUG] Error loading API key from storage:', error);
    return null;
  }
}

/**
 * Save the OpenAI API key to localStorage
 */
export function saveApiKeyToStorage(key: string): void {
  try {
    // Validate and clean key before saving
    const cleanKey = key.trim();
    
    if (!cleanKey.startsWith('sk-')) {
      console.warn('[API_KEY_DEBUG] Attempting to save API key with invalid format:', cleanKey.substring(0, 3) + '...');
    }
    
    localStorage.setItem(STORAGE_KEYS.API_KEY, cleanKey);
    console.log('[API_KEY_DEBUG] API key saved to storage:', cleanKey.substring(0, 5) + '...' + cleanKey.slice(-5));
  } catch (error) {
    console.error('[API_KEY_DEBUG] Error saving API key to storage:', error);
  }
}

/**
 * Load the response style from localStorage
 */
export function loadResponseStyleFromStorage(): string | null {
  try {
    const style = localStorage.getItem(STORAGE_KEYS.RESPONSE_STYLE);
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
    localStorage.setItem(STORAGE_KEYS.RESPONSE_STYLE, style);
  } catch (error) {
    console.error('Error saving response style to storage:', error);
  }
}

/**
 * Load the server proxy setting from localStorage
 */
export function loadUseServerProxyFromStorage(): boolean | null {
  try {
    const useProxy = localStorage.getItem(STORAGE_KEYS.USE_SERVER_PROXY);
    console.log('Loading proxy setting from storage:', useProxy);
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
    console.log('Saving proxy setting to storage:', useProxy);
    localStorage.setItem(STORAGE_KEYS.USE_SERVER_PROXY, String(useProxy));
  } catch (error) {
    console.error('Error saving proxy setting to storage:', error);
  }
}

/**
 * Load the server proxy URL from localStorage
 */
export function loadServerProxyUrlFromStorage(): string | null {
  try {
    const proxyUrl = localStorage.getItem(STORAGE_KEYS.SERVER_PROXY_URL);
    console.log('Loading proxy URL from storage:', proxyUrl);
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
    console.log('Saving proxy URL to storage:', url);
    localStorage.setItem(STORAGE_KEYS.SERVER_PROXY_URL, url);
  } catch (error) {
    console.error('Error saving proxy URL to storage:', error);
  }
}

/**
 * Load debug mode setting from localStorage
 */
export function loadDebugModeFromStorage(): boolean | null {
  try {
    const debugMode = localStorage.getItem(STORAGE_KEYS.DEBUG_MODE);
    return debugMode === null ? null : debugMode === 'true';
  } catch (error) {
    console.error('Error loading debug mode from storage:', error);
    return null;
  }
}

/**
 * Save debug mode setting to localStorage
 */
export function saveDebugModeToStorage(debugMode: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEYS.DEBUG_MODE, String(debugMode));
  } catch (error) {
    console.error('Error saving debug mode to storage:', error);
  }
}

/**
 * Check if an API key is valid format
 */
export function isValidApiKey(key: string | null): boolean {
  if (!key) return false;
  
  // OpenAI API keys should start with 'sk-' and be at least 32 chars
  const trimmedKey = key.trim();
  return trimmedKey.startsWith('sk-') && trimmedKey.length >= 32;
}

/**
 * Check if a URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensure a URL has a proper protocol (https:// or http://)
 */
export function ensureUrlProtocol(url: string): string {
  if (!url) return url;
  
  // If URL already has protocol, return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Default to https protocol
  return `https://${url}`;
}
