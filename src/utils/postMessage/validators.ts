
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
    // Подробное логирование для отладки
    console.log(`[isSafeMessageOrigin] Checking message from origin: ${messageOrigin}`);
    
    // Допускаем сообщения от того же origin или от локального хоста в режиме разработки
    if (messageOrigin === window.location.origin) {
      console.log(`[isSafeMessageOrigin] Message from same origin: ${messageOrigin}`);
      return true;
    }
    
    // Разрешаем локальные origin в режиме разработки
    if (window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1' || 
        window.location.hostname.includes('dev') ||
        window.location.hostname.includes('preview') ||
        window.location.hostname.includes('staging')) {
      console.log(`[isSafeMessageOrigin] Development mode, allowing: ${messageOrigin}`);
      return true;
    }
    
    // Проверяем googletagmanager.com отдельно
    if (messageOrigin.includes('googletagmanager.com')) {
      console.log(`[isSafeMessageOrigin] Google Tag Manager origin allowed: ${messageOrigin}`);
      return true;
    }
    
    const isAllowed = ALLOWED_ORIGINS.some(allowedOrigin => {
      // Проверка на wildcard поддомены (*.domain.com)
      if (allowedOrigin.startsWith('*.')) {
        const domain = allowedOrigin.substring(2);
        if (messageOrigin.endsWith(domain)) {
          console.log(`[isSafeMessageOrigin] Matched wildcard domain: ${allowedOrigin}`);
          return true;
        }
      }
      
      return messageOrigin === allowedOrigin || messageOrigin.includes(allowedOrigin);
    });
    
    console.log(`[isSafeMessageOrigin] Origin ${messageOrigin} allowed: ${isAllowed}`);
    return isAllowed;
  } catch (error) {
    console.error('Error validating message origin:', error);
    return false;
  }
}

/**
 * Для обратной совместимости с существующим кодом
 * Проверяет, разрешен ли указанный origin для данного окна
 * @param window Текущее окно
 * @param originToCheck Origin для проверки
 * @returns true если origin разрешен
 */
export function isOriginAllowed(window: Window, originToCheck: string): boolean {
  // Добавляем логирование для отслеживания вызовов
  console.log(`[isOriginAllowed] Checking origin: ${originToCheck}`);
  return isSafeMessageOrigin(window, originToCheck);
}
