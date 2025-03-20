
/**
 * Константы для системы postMessage
 */

// Режим разработки по умолчанию определяется по URL
export const isDevelopmentMode = (window: Window): boolean => {
  return window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1' || 
         window.location.hostname.includes('local') ||
         window.location.hostname.includes('dev') ||
         window.location.hostname.includes('preview') ||
         window.location.hostname.includes('staging');
};

// Флаг для байпаса проверки origin для отладки
export const BYPASS_ORIGIN_CHECK = true;
