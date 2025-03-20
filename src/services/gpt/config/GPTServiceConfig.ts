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
  GPTENGINEER: 'https://gptengineer.app',
  ALLORIGINS: 'https://api.allorigins.win/raw?url=https://api.openai.com/v1',
  CORSPROXY: 'https://corsproxy.io/?https://api.openai.com/v1',
  THINGPROXY: 'https://thingproxy.freeboard.io/fetch/https://api.openai.com/v1',
  LOCAL: 'http://localhost:3000',
  LOCAL_HTTPS: 'https://localhost:3000',
  DIRECT: 'https://api.openai.com/v1',
};

/**
 * Разрешенные домены для postMessage взаимодействия
 * Добавили дополнительные версии доменов
 */
export const ALLOWED_ORIGINS = [
  'https://lovable.dev',
  'https://www.lovable.dev',
  'https://gptengineer.app',
  'https://www.gptengineer.app',
  'https://gptengineer.io',
  'https://www.gptengineer.io',
  'http://localhost:3000',
  'https://localhost:3000',
  'http://localhost:8080',
  'https://localhost:8080',
  'http://localhost:5173',
  'https://localhost:5173'
];

/**
 * Проверяет, разрешен ли домен для postMessage взаимодействия
 * Более гибкая проверка для различных окружений
 */
export function isAllowedOrigin(origin: string): boolean {
  // Для отладки и локальной разработки
  if (process.env.NODE_ENV === 'development') {
    // В режиме разработки разрешаем любые localhost или пустой origin
    if (origin === '*' || 
        !origin || 
        origin.includes('localhost') || 
        window.location.hostname === 'localhost') {
      return true;
    }
  }
  
  // Для других доменов делаем более гибкую проверку
  // Это позволит обрабатывать поддомены и варианты с www/без www
  return ALLOWED_ORIGINS.some(allowed => {
    // Точное совпадение
    if (origin === allowed) return true;
    
    // Проверка www/без www вариантов (например, lovable.dev и www.lovable.dev)
    if (allowed.replace('www.', '') === origin.replace('www.', '')) return true;
    
    // В режиме разработки более гибкая проверка для localhost с разными портами
    if (process.env.NODE_ENV === 'development' && 
        allowed.includes('localhost') && 
        origin.includes('localhost')) {
      return true;
    }
    
    return false;
  });
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
