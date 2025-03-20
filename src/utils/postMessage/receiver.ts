
import { isDevelopmentMode, BYPASS_ORIGIN_CHECK } from './constants';
import { isOriginAllowed } from './validators';
import { ALLOWED_ORIGINS } from '@/services/gpt/config/GPTServiceConfig';

/**
 * Безопасная обработка входящих postMessage сообщений
 * @param event Событие message
 * @param callback Функция обработки сообщения
 * @returns true если сообщение было обработано, false если источник не разрешен
 */
export function handleSafePostMessage(
  event: MessageEvent,
  callback: (data: any) => void
): boolean {
  // Для режима разработки
  const isDevelopment = process.env.NODE_ENV === 'development' || 
                        window.location.hostname === 'localhost';
                        
  // Разрешаем сообщения из того же окна
  if (event.source === window) {
    try {
      callback(event.data);
      return true;
    } catch (error) {
      console.error('Error handling same-window message:', error);
      return false;
    }
  }

  // В режиме разработки принимаем сообщения от localhost
  if ((isDevelopment || BYPASS_ORIGIN_CHECK) && (
    !event.origin || 
    event.origin.includes('localhost') || 
    window.location.hostname === 'localhost'
  )) {
    try {
      console.log(`[DEV] Processing message from ${event.origin || 'unknown'}`);
      callback(event.data);
      return true;
    } catch (error) {
      console.error('[DEV] Error handling development message:', error);
      return false;
    }
  }

  // Проверяем, разрешен ли источник сообщения
  const allowed = BYPASS_ORIGIN_CHECK || 
                 (event.origin && isOriginAllowed(event.origin)) || 
                 (event.origin && (
                   event.origin.includes('lovable.') || 
                   event.origin.includes('gptengineer.')
                 ));
                 
  if (!allowed) {
    console.warn(`Message from disallowed origin rejected: ${event.origin || 'unknown'}`);
    
    // В режиме разработки всё равно логируем содержимое
    if (isDevelopment || BYPASS_ORIGIN_CHECK) {
      console.log(`[DEV] Rejected message content:`, event.data);
      
      // In testing mode, process anyway
      if (BYPASS_ORIGIN_CHECK) {
        console.log('[BYPASS] Processing message despite origin check failure');
        try {
          callback(event.data);
          return true;
        } catch (error) {
          console.error('[BYPASS] Error handling bypassed message:', error);
          return false;
        }
      }
    }
    
    return false;
  }

  try {
    // Обрабатываем сообщение
    callback(event.data);
    return true;
  } catch (error) {
    console.error('Error handling message:', error);
    return false;
  }
}

// Хранилище для отслеживания установленных обработчиков
const messageHandlers = new Map<string, (event: MessageEvent) => void>();

/**
 * Настраивает безопасный обработчик сообщений postMessage
 * @param callback Функция обработки сообщения
 * @param handlerId Уникальный идентификатор обработчика (опционально)
 * @returns Функция для удаления обработчика
 */
export function setupMessageListener(
  callback: (data: any, origin: string) => void,
  handlerId: string = 'default'
): () => void {
  // Удаляем существующий обработчик с таким же ID если есть
  if (messageHandlers.has(handlerId)) {
    const existingHandler = messageHandlers.get(handlerId);
    if (existingHandler) {
      window.removeEventListener('message', existingHandler);
      messageHandlers.delete(handlerId);
      console.log(`Removed existing message listener with ID: ${handlerId}`);
    }
  }
  
  const messageHandler = (event: MessageEvent) => {
    const originDisplay = event.origin || 'unknown';
    const isDevelopment = isDevelopmentMode(window);
    
    // Проверка того же окна
    if (event.source === window) {
      callback(event.data, 'same-window');
      return;
    }
    
    // Special case for lovable.app and gptengineer.app subdomains
    if (event.origin && (
      event.origin.includes('lovable.') || 
      event.origin.includes('gptengineer.')
    )) {
      console.log(`[setupMessageListener] Allowing subdomain: ${event.origin}`);
      callback(event.data, event.origin);
      return;
    }
    
    // В режиме разработки принимаем все сообщения для отладки
    if ((isDevelopment || BYPASS_ORIGIN_CHECK) && (
      originDisplay.includes('localhost') || 
      window.location.hostname === 'localhost'
    )) {
      console.log(`[DEV] Received message from ${originDisplay}`);
      callback(event.data, originDisplay);
      return;
    }
    
    // Проверяем, разрешен ли источник сообщения
    const allowed = BYPASS_ORIGIN_CHECK || (event.origin && isOriginAllowed(event.origin));
    if (!allowed) {
      console.warn(`Message from disallowed origin: ${originDisplay}`);
      
      // В режиме разработки всё равно показываем содержимое
      if (isDevelopment) {
        console.log(`[DEV] Rejected message content from ${originDisplay}:`, event.data);
      }
      
      // In testing mode, process anyway
      if (BYPASS_ORIGIN_CHECK) {
        console.log('[BYPASS] Processing message despite origin check failure');
        callback(event.data, originDisplay);
      }
      
      return;
    }
    
    // Обрабатываем сообщение через callback
    callback(event.data, event.origin);
  };

  // Добавляем обработчик и сохраняем его
  window.addEventListener('message', messageHandler);
  messageHandlers.set(handlerId, messageHandler);
  
  console.log(`PostMessage listener set up with ID: ${handlerId}, allowed origins:`, ALLOWED_ORIGINS);
  
  // Возвращаем функцию очистки
  return () => {
    if (messageHandlers.has(handlerId)) {
      const handler = messageHandlers.get(handlerId);
      if (handler) {
        window.removeEventListener('message', handler);
        messageHandlers.delete(handlerId);
        console.log(`Removed message listener with ID: ${handlerId}`);
      }
    }
  };
}
