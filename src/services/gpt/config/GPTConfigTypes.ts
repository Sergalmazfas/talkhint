
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
