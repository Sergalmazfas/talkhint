
import { ALLOWED_ORIGINS } from '@/services/gpt/config/GPTServiceConfig';
import { isDevelopmentMode, BYPASS_ORIGIN_CHECK } from './constants';

/**
 * Проверяет, разрешен ли домен для обмена сообщениями
 * @param origin Домен для проверки
 * @returns boolean
 */
export function isOriginAllowed(origin: string): boolean {
  // Подробное логирование для отладки
  console.log(`[isOriginAllowed] Checking if ${origin} is allowed`);
  
  // Для bypass режима или разработки - пропускаем проверку
  if (BYPASS_ORIGIN_CHECK) {
    console.log(`[isOriginAllowed] Bypass enabled, allowing ${origin}`);
    return true;
  }
  
  // Для пустого origin
  if (!origin) {
    console.log(`[isOriginAllowed] Empty origin, allowed only in development: ${process.env.NODE_ENV === 'development'}`);
    return process.env.NODE_ENV === 'development';
  }
  
  // Для localhost всегда разрешаем в режиме разработки
  if (origin.includes('localhost') && process.env.NODE_ENV === 'development') {
    console.log(`[isOriginAllowed] Localhost in development, allowing`);
    return true;
  }
  
  // Проверка разрешенных доменов из конфигурации
  const allowed = ALLOWED_ORIGINS.includes(origin) || 
                 origin.includes('localhost') || 
                 origin.includes('lovable.') ||
                 origin.includes('gptengineer.');
                 
  console.log(`[isOriginAllowed] Origin ${origin} allowed: ${allowed}`);
  return allowed;
}

/**
 * Проверяет, является ли targetOrigin безопасным для отправки сообщений
 * @param window Объект окна
 * @param targetOrigin Целевой домен
 * @returns boolean
 */
export function isSafeTargetOrigin(window: Window, targetOrigin: string): boolean {
  // Для режима разработки или байпаса - расширенные разрешения
  if (isDevelopmentMode(window) || BYPASS_ORIGIN_CHECK) {
    return true;
  }
  
  // Пустой targetOrigin разрешаем только в режиме разработки
  if (!targetOrigin) {
    return isDevelopmentMode(window);
  }
  
  // Wildcard разрешаем только в режиме разработки или байпаса
  if (targetOrigin === '*') {
    return isDevelopmentMode(window) || BYPASS_ORIGIN_CHECK;
  }
  
  // Special case для поддоменов lovable и gptengineer
  if (targetOrigin.includes('lovable.') || targetOrigin.includes('gptengineer.')) {
    return true;
  }
  
  // Проверка точного совпадения с разрешенными доменами
  return ALLOWED_ORIGINS.includes(targetOrigin);
}
