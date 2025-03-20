
import { ALLOWED_ORIGINS } from '@/services/gpt/config/GPTServiceConfig';
import { isDevelopmentMode, BYPASS_ORIGIN_CHECK } from './constants';
import { isSafeTargetOrigin } from './validators';

/**
 * Безопасная отправка сообщений с проверкой разрешенных доменов
 * @param window Объект окна
 * @param targetWindow Целевое окно (например, iframe.contentWindow)
 * @param message Сообщение для отправки
 * @param targetOrigin Целевой домен
 * @returns true если сообщение было отправлено, false если целевой домен не разрешен
 */
export function safePostMessage(
  window: Window,
  targetWindow: Window | null,
  message: any,
  targetOrigin: string
): boolean {
  if (!targetWindow) {
    console.error('Target window is null or undefined');
    return false;
  }

  // Определяем режим - разработка или продакшн
  const isDevelopment = isDevelopmentMode(window);
  
  // Если targetWindow это то же самое окно или iframe без контентного окна
  if (targetWindow === window || !targetWindow.postMessage) {
    console.warn('[safePostMessage] Target window is the same as source or invalid');
    return false;
  }

  // Подробное логирование для отладки
  console.log(`[safePostMessage] Attempting to send message to ${targetOrigin || 'unknown'}`);
  console.log(`[safePostMessage] Current origin: ${window.location.origin}`);

  // Обогащаем сообщение отладочной информацией
  const enrichedMessage = {
    ...message,
    _source: window.location.origin,
    _timestamp: new Date().toISOString(),
    _via: isDevelopment ? 'safePostMessage-dev' : 'safePostMessage-prod',
    _allowedOrigins: ALLOWED_ORIGINS
  };

  try {
    // Для локальной разработки - используем '*' для простоты тестирования
    if (isDevelopment) {
      console.log('[DEV] Sending message with wildcard origin for development');
      targetWindow.postMessage(enrichedMessage, '*');
      
      // Также пробуем с точным origin, если он указан
      if (targetOrigin && targetOrigin !== '*') {
        try {
          targetWindow.postMessage(enrichedMessage, targetOrigin);
          console.log(`[DEV] Also sent with specific origin: ${targetOrigin}`);
        } catch (e) {
          console.warn(`[DEV] Failed with specific origin: ${e}`);
        }
      }
      
      return true;
    }
    
    // Проверяем, разрешен ли домен в обычном режиме
    const allowed = BYPASS_ORIGIN_CHECK || isSafeTargetOrigin(window, targetOrigin);
    console.log(`[safePostMessage] Target origin ${targetOrigin} allowed: ${allowed}`);
    
    if (!allowed) {
      console.error(`Target origin ${targetOrigin} is not in the allowed list`, ALLOWED_ORIGINS);
      
      // В режиме байпаса или разработки отправляем сообщение для отладки
      if (BYPASS_ORIGIN_CHECK || isDevelopment) {
        console.warn('[BYPASS/DEV] Sending despite origin check failure');
        targetWindow.postMessage(enrichedMessage, '*');
        return true;
      }
      
      return false;
    }
    
    // В продакшене отправляем сообщение только на проверенный origin
    console.log(`Sending message to ${targetOrigin}:`, enrichedMessage);
    targetWindow.postMessage(enrichedMessage, targetOrigin);
    
    return true;
  } catch (error) {
    console.error('Error posting message:', error);
    
    // Попытка отправить через wildcard в режиме разработки
    if (isDevelopment || BYPASS_ORIGIN_CHECK) {
      try {
        console.warn('Attempting fallback with wildcard origin');
        targetWindow.postMessage(enrichedMessage, '*');
        return true;
      } catch (fallbackError) {
        console.error('Even fallback sending failed:', fallbackError);
      }
    }
    
    return false;
  }
}
