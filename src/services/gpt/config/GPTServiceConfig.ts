
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
  useServerProxy: true, // Always using server proxy
  maxRetries: 3,
  timeoutMs: 60000,
};

/**
 * Available proxy servers for CORS issues
 */
export const PROXY_SERVERS = {
  // Primary proxies
  VERCEL: 'https://lovable-server.vercel.app',
  GPTENGINEER: 'https://gptengineer.app',
  
  // Fallback proxies - These should only be used if main proxies fail
  CORSPROXY: 'https://corsproxy.io/?https://api.openai.com/v1',
  CORS_ANYWHERE: 'https://cors-anywhere-lyart-seven.vercel.app',
  
  // Additional proxy services
  ALLORIGINS: 'https://api.allorigins.win/raw?url=https://api.openai.com/v1',
  THINGPROXY: 'https://thingproxy.freeboard.io/fetch/https://api.openai.com/v1',
  
  // Development proxies
  LOCAL: 'http://localhost:3000',
  LOCAL_HTTPS: 'https://localhost:3000',
  
  // Not recommended - direct connection
  DIRECT: 'https://api.openai.com/v1',
};

/**
 * Extended allowed domains for postMessage communication
 * Added all possible domain and protocol variants
 */
export const ALLOWED_ORIGINS = [
  // Lovable domains
  'https://lovable.dev',
  'https://www.lovable.dev',
  'http://lovable.dev',
  'http://www.lovable.dev',
  'https://id-preview--be5c3e65-2457-46cb-a8e0-02444f6fdcc1.lovable.app',
  'https://id-preview--be5c3e65-2457-46cb-a8e0-02444f6fdcc1.lovable.app:3000',
  
  // GPT Engineer domains
  'https://gptengineer.app',
  'https://www.gptengineer.app',
  'http://gptengineer.app',
  'http://www.gptengineer.app',
  'https://gptengineer.io',
  'https://www.gptengineer.io',
  'http://gptengineer.io',
  'http://www.gptengineer.io',
  
  // Localhost with various ports
  'http://localhost:3000',
  'https://localhost:3000',
  'http://localhost:8080',
  'https://localhost:8080',
  'http://localhost:5173',
  'https://localhost:5173',
  'http://localhost',
  'https://localhost',
  
  // Lovable server domains
  'https://lovable-server.vercel.app',
  'http://lovable-server.vercel.app',
  
  // Дополнительно добавим все возможные поддомены lovable.app и gptengineer.app
  '*.lovable.app',
  '*.gptengineer.app',
  
  // Include any active deployment domain
  '*.vercel.app',
  
  // Wildcard for development only - will be filtered in production
  '*'
];

/**
 * Enhanced allowed domain check with detailed logging and support for wildcards
 * @param origin Domain to check
 * @returns true if domain is allowed, false otherwise
 */
export function isAllowedOrigin(origin: string): boolean {
  console.log(`[isAllowedOrigin] Checking if origin is allowed: ${origin}`);
  
  // For debugging and local development
  if (process.env.NODE_ENV === 'development') {
    // In development mode, allow any localhost or empty origin
    if (origin === '*' || 
        !origin || 
        origin.includes('localhost') || 
        window.location.hostname === 'localhost') {
      console.log(`[isAllowedOrigin] Development mode: allowing ${origin || 'empty origin'}`);
      return true;
    }
  }
  
  // If origin is empty, allow only in development mode
  if (!origin) {
    const isDev = process.env.NODE_ENV === 'development';
    console.log(`[isAllowedOrigin] Empty origin, allowed: ${isDev}`);
    return isDev;
  }
  
  // For wildcard origin - allow only in development mode
  if (origin === '*') {
    const isDev = process.env.NODE_ENV === 'development';
    console.log(`[isAllowedOrigin] Wildcard origin, allowed: ${isDev}`);
    return isDev;
  }
  
  // Check basic domains regardless of protocol and www
  function normalizeOrigin(url: string): string {
    try {
      return url.replace(/^https?:\/\//, '')  // Remove protocol
                .replace(/^www\./, '')        // Remove www.
                .replace(/:\d+$/, '')         // Remove port
                .toLowerCase();               // Normalize case
    } catch (e) {
      console.error("[isAllowedOrigin] Error normalizing origin:", e);
      return url.toLowerCase();
    }
  }
  
  const normalizedInput = normalizeOrigin(origin);
  console.log(`[isAllowedOrigin] Normalized input: ${normalizedInput}`);
  
  // Проверка для поддоменов с маской *.domain.com
  for (const allowed of ALLOWED_ORIGINS) {
    if (allowed.startsWith('*.')) {
      const domain = allowed.substring(2); // Удаляем *. в начале
      if (normalizedInput.endsWith(domain)) {
        console.log(`[isAllowedOrigin] Matched wildcard domain: *.${domain}`);
        return true;
      }
    }
  }
  
  // Special case for lovable.app subdomains
  if (normalizedInput.includes('lovable.app')) {
    console.log(`[isAllowedOrigin] Allowing lovable.app subdomain: ${normalizedInput}`);
    return true;
  }
  
  // Special case for gptengineer.app subdomains
  if (normalizedInput.includes('gptengineer.app')) {
    console.log(`[isAllowedOrigin] Allowing gptengineer.app subdomain: ${normalizedInput}`);
    return true;
  }
  
  // Special case for server domain
  if (normalizedInput.includes('lovable-server.vercel.app')) {
    console.log(`[isAllowedOrigin] Allowing lovable-server.vercel.app domain: ${normalizedInput}`);
    return true;
  }
  
  // Check against all allowed domains
  for (const allowed of ALLOWED_ORIGINS) {
    // Skip wildcard patterns
    if (allowed === '*' || allowed.includes('*')) {
      continue;
    }
    
    // Exact match
    if (origin === allowed) {
      console.log(`[isAllowedOrigin] Exact match with ${allowed}`);
      return true;
    }
    
    // Normalized domains comparison
    const normalizedAllowed = normalizeOrigin(allowed);
    if (normalizedInput === normalizedAllowed) {
      console.log(`[isAllowedOrigin] Normalized match: ${normalizedInput} === ${normalizedAllowed}`);
      return true;
    }
    
    // Check for localhost addresses
    if (process.env.NODE_ENV === 'development' && 
        (normalizedInput.includes('localhost') || normalizedAllowed.includes('localhost'))) {
      console.log(`[isAllowedOrigin] Development localhost match`);
      return true;
    }
  }
  
  console.log(`[isAllowedOrigin] Origin ${origin} is NOT allowed`);
  return false;
}

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
