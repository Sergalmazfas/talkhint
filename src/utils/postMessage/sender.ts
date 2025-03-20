
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

  // Подробное логирование для отладки
  console.log(`[safePostMessage] Attempting to send message to ${targetOrigin || 'unknown'}`);
  console.log(`[safePostMessage] Current origin: ${window.location.origin}`);
  
  // Определяем режим - разработка или продакшн
  const isDevelopment = isDevelopmentMode(window);

  // Для локальной разработки - максимально расширенные разрешения
  if (isDevelopment && (
      targetOrigin === '*' ||
      !targetOrigin ||
      targetOrigin.includes('localhost') || 
      window.location.hostname === 'localhost'
  )) {
    return sendDevModeMessage(window, targetWindow, message, targetOrigin);
  }

  // Проверяем, разрешен ли домен в обычном режиме
  const allowed = isSafeTargetOrigin(window, targetOrigin);
  console.log(`[safePostMessage] Target origin ${targetOrigin} allowed: ${allowed} (bypass: ${BYPASS_ORIGIN_CHECK})`);
  
  if (!allowed) {
    console.error(`Target origin ${targetOrigin} is not in the allowed list`, ALLOWED_ORIGINS);
    
    // В режиме разработки всё равно пробуем отправить для отладки
    if (isDevelopment || BYPASS_ORIGIN_CHECK) {
      return sendFallbackMessage(window, targetWindow, message, targetOrigin);
    }
    
    return false;
  }

  return sendProductionMessage(window, targetWindow, message, targetOrigin);
}

/**
 * Отправка сообщения в режиме разработки
 * @param window Объект окна
 * @param targetWindow Целевое окно
 * @param message Сообщение для отправки
 * @param targetOrigin Целевой домен
 * @returns boolean
 */
function sendDevModeMessage(
  window: Window,
  targetWindow: Window,
  message: any,
  targetOrigin: string
): boolean {
  try {
    // Добавляем информацию об источнике сообщения
    const enrichedMessage = {
      ...message,
      _source: window.location.origin,
      _timestamp: new Date().toISOString(),
      _debug: true,
      _via: 'safePostMessage-dev',
      _allowedOrigins: ALLOWED_ORIGINS
    };

    console.log(`[DEV] Sending message to ${targetOrigin || 'unknown'}:`, enrichedMessage);
    
    // В режиме разработки сначала пробуем с точным origin, если он известен
    if (targetOrigin && targetOrigin !== '*') {
      try {
        targetWindow.postMessage(enrichedMessage, targetOrigin);
        console.log(`[DEV] Sent with specific origin: ${targetOrigin}`);
      } catch (specificError) {
        console.warn(`[DEV] Failed with specific origin, trying wildcard:`, specificError);
      }
    }
    
    // В режиме разработки всегда дублируем с wildcard для совместимости
    targetWindow.postMessage(enrichedMessage, '*');
    console.log('[DEV] Sent with wildcard origin for debugging');
    
    // Также пробуем ключевые домены из списка разрешенных
    for (const origin of ALLOWED_ORIGINS) {
      if (origin !== '*' && origin !== targetOrigin) {
        try {
          targetWindow.postMessage({
            ...enrichedMessage,
            _targetOrigin: origin,
          }, origin);
          console.log(`[DEV] Tried sending to ${origin}`);
        } catch (multiError) {
          // Игнорируем ошибки при мультидоменной отправке в режиме отладки
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('[DEV] Error posting message:', error);
    return false;
  }
}

/**
 * Отправка fallback-сообщения при неразрешенном домене
 * @param window Объект окна
 * @param targetWindow Целевое окно
 * @param message Сообщение для отправки
 * @param targetOrigin Целевой домен
 * @returns boolean
 */
function sendFallbackMessage(
  window: Window,
  targetWindow: Window,
  message: any,
  targetOrigin: string
): boolean {
  try {
    const debugMessage = {
      ...message,
      _source: window.location.origin,
      _timestamp: new Date().toISOString(),
      _debug: true,
      _warning: `Using wildcard origin because ${targetOrigin} is not allowed`,
      _via: 'safePostMessage-fallback',
      _allowedOrigins: ALLOWED_ORIGINS
    };
    
    targetWindow.postMessage(debugMessage, '*');
    console.warn(`[DEV] Sent with wildcard origin as fallback for ${targetOrigin}`);
    
    // Пробуем отправить на все разрешенные домены
    for (const origin of ALLOWED_ORIGINS) {
      if (origin !== '*') {
        try {
          targetWindow.postMessage({
            ...debugMessage,
            _targetOrigin: origin,
          }, origin);
          console.log(`[DEV] Tried fallback to ${origin}`);
        } catch (e) {
          // Игнорируем ошибки
        }
      }
    }
    
    return true;
  } catch (fallbackError) {
    console.error('[DEV] Even fallback sending failed:', fallbackError);
    return false;
  }
}

/**
 * Отправка сообщения в продакшен-режиме
 * @param window Объект окна
 * @param targetWindow Целевое окно
 * @param message Сообщение для отправки
 * @param targetOrigin Целевой домен
 * @returns boolean
 */
function sendProductionMessage(
  window: Window,
  targetWindow: Window,
  message: any,
  targetOrigin: string
): boolean {
  try {
    // Добавляем информацию об источнике сообщения
    const enrichedMessage = {
      ...message,
      _source: window.location.origin,
      _timestamp: new Date().toISOString(),
      _via: 'safePostMessage-prod',
      _allowedOrigins: ALLOWED_ORIGINS
    };

    // Отправляем сообщение с точным указанием targetOrigin
    console.log(`Sending message to ${targetOrigin}:`, enrichedMessage);
    
    // First try with exact target origin
    try {
      targetWindow.postMessage(enrichedMessage, targetOrigin);
      console.log(`Successfully sent to ${targetOrigin}`);
    } catch (e) {
      console.warn(`Failed to send to ${targetOrigin}, falling back to alternatives:`, e);
    }
    
    // В режиме разработки или при включенном байпасе дублируем с wildcard для отладки
    if (isDevelopmentMode(window) || BYPASS_ORIGIN_CHECK) {
      try {
        targetWindow.postMessage(enrichedMessage, '*');
        console.log('[DEV] Also sent with wildcard origin for debugging');
      } catch (e) {
        console.warn('[DEV] Failed to send with wildcard:', e);
      }
      
      // Пробуем отправить на все разрешенные домены
      for (const origin of ALLOWED_ORIGINS) {
        if (origin !== '*' && origin !== targetOrigin) {
          try {
            targetWindow.postMessage({
              ...enrichedMessage,
              _targetOrigin: origin,
            }, origin);
            console.log(`[DEV] Tried sending to ${origin}`);
          } catch (e) {
            // Игнорируем ошибки
          }
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error posting message:', error);
    
    // Пробуем отправить через '*' только в режиме разработки или при включенном байпасе
    if (isDevelopmentMode(window) || BYPASS_ORIGIN_CHECK) {
      try {
        console.warn('Attempting to send with wildcard origin as fallback');
        const enrichedMessage = {
          ...message,
          _source: window.location.origin,
          _timestamp: new Date().toISOString(),
          _fallback: true,
          _via: 'safePostMessage-emergency',
          _allowedOrigins: ALLOWED_ORIGINS
        };
        targetWindow.postMessage(enrichedMessage, '*');
        console.log('Sent emergency message with wildcard origin');
        
        // Пробуем отправить на все разрешенные домены
        for (const origin of ALLOWED_ORIGINS) {
          if (origin !== '*' && origin !== targetOrigin) {
            try {
              targetWindow.postMessage({
                ...enrichedMessage,
                _targetOrigin: origin,
              }, origin);
              console.log(`Tried emergency sending to ${origin}`);
            } catch (e) {
              // Игнорируем ошибки
            }
          }
        }
        
        return true;
      } catch (fallbackError) {
        console.error('Even fallback sending failed:', fallbackError);
      }
    }
    
    return false;
  }
}

