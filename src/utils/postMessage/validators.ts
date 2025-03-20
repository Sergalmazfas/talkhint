
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
  
  // Проверка разрешенных доменов из конфигурации
  const allowed = ALLOWED_ORIGINS.includes(origin) || 
                 origin.includes('localhost') || 
                 origin.includes('lovable.app');
                 
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
  // Для режима разработки - расширенные разрешения
  if (isDevelopmentMode(window) && (
      targetOrigin === '*' ||
      !targetOrigin ||
      targetOrigin.includes('localhost') || 
      window.location.hostname === 'localhost'
  )) {
    return true;
  }
  
  // Для обычного режима - проверяем разрешенный домен
  return BYPASS_ORIGIN_CHECK || isOriginAllowed(targetOrigin);
}

