
import { ALLOWED_ORIGINS } from '@/services/gpt/config/GPTServiceConfig';
import { isDevelopmentMode, BYPASS_ORIGIN_CHECK, safeStringify } from './constants';
import { isSafeTargetOrigin } from './validators';

// Counter to prevent infinite loops
let messageCounter = 0;
const MAX_MESSAGES_PER_SECOND = 30;
const messageTimestamps: number[] = [];

// Кэш для отслеживания недавно отправленных сообщений
const recentlySentMessages = new Set<string>();
const MAX_RECENT_MESSAGES = 100;

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
    console.error('[safePostMessage] Target window is null or undefined');
    return false;
  }

  // Проверка, не отправляем ли мы сообщение самим себе
  if (targetWindow === window) {
    console.warn('[safePostMessage] Trying to send message to self, aborting');
    return false;
  }

  // Защита от отправки одинаковых сообщений несколько раз подряд
  const messageKey = `${targetOrigin}:${safeStringify(message)}`;
  if (recentlySentMessages.has(messageKey)) {
    console.warn('[safePostMessage] Duplicate message detected, skipping to prevent loops');
    return false;
  }
  
  // Добавляем сообщение в кэш отправленных
  recentlySentMessages.add(messageKey);
  
  // Ограничиваем размер кэша
  if (recentlySentMessages.size > MAX_RECENT_MESSAGES) {
    const iterator = recentlySentMessages.values();
    recentlySentMessages.delete(iterator.next().value);
  }

  // Проверка лимита сообщений для предотвращения зацикливания
  const now = Date.now();
  messageTimestamps.push(now);
  
  // Удаляем старые временные метки (старше 1 секунды)
  while (messageTimestamps.length > 0 && messageTimestamps[0] < now - 1000) {
    messageTimestamps.shift();
  }
  
  // Проверяем, не превышен ли лимит сообщений
  if (messageTimestamps.length > MAX_MESSAGES_PER_SECOND) {
    console.error(`[safePostMessage] Too many messages (${messageTimestamps.length}) in the last second. Potential infinite loop detected.`);
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
    _id: messageCounter++
  };

  try {
    // Для локальной разработки - используем '*' для простоты тестирования
    if (isDevelopment) {
      console.log('[DEV] Sending message with wildcard origin for development');
      targetWindow.postMessage(enrichedMessage, '*');
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
    console.error('[safePostMessage] Error posting message:', error);
    
    // Попытка отправить через wildcard в режиме разработки
    if (isDevelopment || BYPASS_ORIGIN_CHECK) {
      try {
        console.warn('[safePostMessage] Attempting fallback with wildcard origin');
        targetWindow.postMessage(enrichedMessage, '*');
        return true;
      } catch (fallbackError) {
        console.error('[safePostMessage] Even fallback sending failed:', fallbackError);
      }
    }
    
    return false;
  }
}
