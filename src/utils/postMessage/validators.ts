
import { ALLOWED_ORIGINS } from '@/services/gpt/config/GPTServiceConfig';

/**
 * Проверяет, что origin сообщения находится в списке разрешенных
 * @param window - объект окна
 * @param origin - происхождение для проверки
 * @returns true если origin в списке разрешенных
 */
export function isSafeTargetOrigin(window: Window, targetOrigin: string): boolean {
  try {
    // Проверяем, что targetOrigin не пустой
    if (!targetOrigin) {
      console.warn('Target origin is empty');
      return false;
    }
    
    // Разрешаем любой origin в режиме разработки или тестирования
    if (window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1' || 
        window.location.hostname.includes('local') ||
        window.location.hostname.includes('dev') ||
        window.location.hostname.includes('preview') ||
        window.location.hostname.includes('staging')) {
      return true;
    }
    
    // Проверяем, что origin находится в списке разрешенных
    return ALLOWED_ORIGINS.some(allowedOrigin => {
      return targetOrigin === allowedOrigin || 
             targetOrigin === '*' ||
             targetOrigin.includes(allowedOrigin);
    });
  } catch (error) {
    console.error('Error validating target origin:', error);
    return false;
  }
}

/**
 * Проверяет origin входящего сообщения
 * @param window - Объект окна
 * @param messageOrigin - Origin сообщения для проверки
 * @returns true если origin в списке разрешенных
 */
export function isSafeMessageOrigin(window: Window, messageOrigin: string): boolean {
  try {
    // Допускаем сообщения от того же origin или от локального хоста в режиме разработки
    if (messageOrigin === window.location.origin) {
      return true;
    }
    
    // Разрешаем локальные origin в режиме разработки
    if (window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1' || 
        window.location.hostname.includes('dev') ||
        window.location.hostname.includes('preview') ||
        window.location.hostname.includes('staging')) {
      return true;
    }
    
    return ALLOWED_ORIGINS.some(allowedOrigin => {
      return messageOrigin === allowedOrigin || messageOrigin.includes(allowedOrigin);
    });
  } catch (error) {
    console.error('Error validating message origin:', error);
    return false;
  }
}

// Add compatibility function for the older API that was referenced in index.ts
export const isOriginAllowed = isSafeMessageOrigin;

