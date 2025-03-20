
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
  CORS_ANYWHERE: 'https://cors-anywhere-lyart-seven.vercel.app',
  LOCAL: 'http://localhost:3000',
  LOCAL_HTTPS: 'https://localhost:3000',
  DIRECT: 'https://api.openai.com/v1',
};

/**
 * Расширенные разрешенные домены для postMessage взаимодействия
 * Добавлены все возможные варианты доменов и протоколов
 */
export const ALLOWED_ORIGINS = [
  // Lovable domains
  'https://lovable.dev',
  'https://www.lovable.dev',
  'http://lovable.dev',
  'http://www.lovable.dev',
  
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
  
  // Wildcard for development only - will be filtered in production
  '*'
];

/**
 * Улучшенная проверка разрешенного домена с подробным логированием
 * @param origin Домен для проверки
 * @returns true если домен разрешен, false если не разрешен
 */
export function isAllowedOrigin(origin: string): boolean {
  console.log(`[isAllowedOrigin] Checking if origin is allowed: ${origin}`);
  
  // Для отладки и локальной разработки
  if (process.env.NODE_ENV === 'development') {
    // В режиме разработки разрешаем любые localhost или пустой origin
    if (origin === '*' || 
        !origin || 
        origin.includes('localhost') || 
        window.location.hostname === 'localhost') {
      console.log(`[isAllowedOrigin] Development mode: allowing ${origin || 'empty origin'}`);
      return true;
    }
  }
  
  // Если origin пустой, разрешаем только в режиме разработки
  if (!origin) {
    const isDev = process.env.NODE_ENV === 'development';
    console.log(`[isAllowedOrigin] Empty origin, allowed: ${isDev}`);
    return isDev;
  }
  
  // Для wildcard origin - разрешаем только в режиме разработки
  if (origin === '*') {
    const isDev = process.env.NODE_ENV === 'development';
    console.log(`[isAllowedOrigin] Wildcard origin, allowed: ${isDev}`);
    return isDev;
  }
  
  // Проверка базовых доменов независимо от протокола и www
  function normalizeOrigin(url: string): string {
    return url.replace(/^https?:\/\//, '')  // Удаляем протокол
              .replace(/^www\./, '')        // Удаляем www.
              .replace(/:\d+$/, '');        // Удаляем порт
  }
  
  const normalizedInput = normalizeOrigin(origin);
  console.log(`[isAllowedOrigin] Normalized input: ${normalizedInput}`);
  
  // Проверяем по всем разрешенным доменам
  for (const allowed of ALLOWED_ORIGINS) {
    // Пропускаем wildcard для продакшена
    if (allowed === '*' && process.env.NODE_ENV !== 'development') {
      continue;
    }
    
    // Точное совпадение
    if (origin === allowed) {
      console.log(`[isAllowedOrigin] Exact match with ${allowed}`);
      return true;
    }
    
    // Сравнение нормализованных доменов
    const normalizedAllowed = normalizeOrigin(allowed);
    if (normalizedInput === normalizedAllowed) {
      console.log(`[isAllowedOrigin] Normalized match: ${normalizedInput} === ${normalizedAllowed}`);
      return true;
    }
    
    // Проверка локальных адресов
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
