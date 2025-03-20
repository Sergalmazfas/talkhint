
import { ALLOWED_ORIGINS, isAllowedOrigin } from '@/services/gpt/config/GPTServiceConfig';

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

  // Текущий режим - разработка или продакшн
  const isDevelopment = process.env.NODE_ENV === 'development' || 
                        window.location.hostname === 'localhost';

  // Для локальной разработки временно разрешаем любые домены
  if (isDevelopment && (
      targetOrigin.includes('localhost') || 
      window.location.hostname === 'localhost'
  )) {
    try {
      // Добавляем информацию об источнике сообщения
      const enrichedMessage = {
        ...message,
        _source: window.location.origin,
        _timestamp: new Date().toISOString(),
        _debug: true
      };

      // Сначала пробуем отправить на конкретный домен
      console.log(`[DEV] Sending message to ${targetOrigin}:`, enrichedMessage);
      targetWindow.postMessage(enrichedMessage, targetOrigin);
      
      // Для отладки также пробуем отправить с wildcard
      targetWindow.postMessage(enrichedMessage, '*');
      console.log('[DEV] Also sent with wildcard origin for debugging');
      
      return true;
    } catch (error) {
      console.error('[DEV] Error posting message:', error);
      return false;
    }
  }

  // Проверяем, разрешен ли домен в продакшене
  if (!isAllowedOrigin(targetOrigin)) {
    console.error(`Target origin ${targetOrigin} is not in the allowed list`, ALLOWED_ORIGINS);
    
    // В режиме разработки разрешаем wildcard для отладки
    if (isDevelopment) {
      try {
        const debugMessage = {
          ...message,
          _source: window.location.origin,
          _timestamp: new Date().toISOString(),
          _debug: true,
          _warning: `Using wildcard origin because ${targetOrigin} is not allowed`
        };
        
        targetWindow.postMessage(debugMessage, '*');
        console.warn(`[DEV] Sent with wildcard origin as fallback for ${targetOrigin}`);
        return true;
      } catch (fallbackError) {
        console.error('[DEV] Even fallback sending failed:', fallbackError);
        return false;
      }
    }
    
    return false;
  }

  try {
    // Добавляем информацию об источнике сообщения
    const enrichedMessage = {
      ...message,
      _source: window.location.origin,
      _timestamp: new Date().toISOString()
    };

    // Отправляем сообщение с точным указанием targetOrigin
    console.log(`Sending message to ${targetOrigin}:`, enrichedMessage);
    targetWindow.postMessage(enrichedMessage, targetOrigin);
    
    // В режиме разработки дублируем с wildcard для отладки
    if (isDevelopment) {
      targetWindow.postMessage(enrichedMessage, '*');
      console.log('[DEV] Also sent with wildcard origin for debugging');
    }
    
    return true;
  } catch (error) {
    console.error('Error posting message:', error);
    
    // Пробуем отправить через '*' только в режиме разработки
    if (isDevelopment) {
      try {
        console.warn('Attempting to send with wildcard origin (development only)');
        const enrichedMessage = {
          ...message,
          _source: window.location.origin,
          _timestamp: new Date().toISOString(),
          _fallback: true
        };
        targetWindow.postMessage(enrichedMessage, '*');
        return true;
      } catch (fallbackError) {
        console.error('Even fallback sending failed:', fallbackError);
      }
    }
    
    return false;
  }
}

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
  if (isDevelopment && (
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
  if (!event.origin || !isAllowedOrigin(event.origin)) {
    console.warn(`Message from disallowed origin rejected: ${event.origin || 'unknown'}`);
    
    // В режиме разработки всё равно логируем содержимое
    if (isDevelopment) {
      console.log(`[DEV] Rejected message content:`, event.data);
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

/**
 * Настраивает безопасный обработчик сообщений postMessage
 * @param callback Функция обработки сообщения
 * @returns Функция для удаления обработчика
 */
export function setupMessageListener(
  callback: (data: any, origin: string) => void
): () => void {
  const messageHandler = (event: MessageEvent) => {
    const originDisplay = event.origin || 'unknown';
    const isDevelopment = process.env.NODE_ENV === 'development' || 
                          window.location.hostname === 'localhost';
    
    // Проверка того же окна
    if (event.source === window) {
      callback(event.data, 'same-window');
      return;
    }
    
    // В режиме разработки принимаем все сообщения для отладки
    if (isDevelopment && (
      originDisplay.includes('localhost') || 
      window.location.hostname === 'localhost'
    )) {
      console.log(`[DEV] Received message from ${originDisplay}`);
      callback(event.data, originDisplay);
      return;
    }
    
    // Проверяем, разрешен ли источник сообщения
    if (!event.origin || !isAllowedOrigin(event.origin)) {
      console.warn(`Message from disallowed origin: ${originDisplay}`);
      
      // В режиме разработки всё равно показываем содержимое
      if (isDevelopment) {
        console.log(`[DEV] Rejected message content from ${originDisplay}:`, event.data);
      }
      
      return;
    }
    
    // Обрабатываем сообщение через callback
    callback(event.data, event.origin);
  };

  // Добавляем обработчик
  window.addEventListener('message', messageHandler);
  console.log('PostMessage listener set up with allowed origins:', ALLOWED_ORIGINS);
  
  // Возвращаем функцию очистки
  return () => {
    window.removeEventListener('message', messageHandler);
    console.log('PostMessage listener removed');
  };
}

/**
 * Тестирует постмессенджи для всех известных доменов
 * @param message Сообщение для отправки
 * @returns Объект с результатами отправки
 */
export function testPostMessageAllOrigins(message: any): Record<string, boolean> {
  const results: Record<string, boolean> = {};
  const isDevelopment = process.env.NODE_ENV === 'development' || 
                        window.location.hostname === 'localhost';
  
  // Пробуем отправить сообщение во все разрешенные домены
  ALLOWED_ORIGINS.forEach(origin => {
    // Пропускаем wildcard в продакшене
    if (origin === '*' && !isDevelopment) {
      return;
    }
    
    try {
      console.log(`Attempting to send test message to ${origin}`);
      const enrichedMessage = {
        ...message,
        _source: window.location.origin,
        _timestamp: new Date().toISOString(),
        _test: true
      };
      
      window.parent.postMessage(enrichedMessage, origin);
      results[origin] = true;
    } catch (error) {
      console.error(`Failed to send test message to ${origin}:`, error);
      results[origin] = false;
    }
  });
  
  // В режиме разработки также тестируем с wildcard
  if (isDevelopment) {
    try {
      console.log(`[DEV] Attempting to send test message with wildcard`);
      const enrichedMessage = {
        ...message,
        _source: window.location.origin,
        _timestamp: new Date().toISOString(),
        _test: true,
        _wildcard: true
      };
      
      window.parent.postMessage(enrichedMessage, '*');
      results['* (wildcard)'] = true;
    } catch (error) {
      console.error(`[DEV] Failed to send test message with wildcard:`, error);
      results['* (wildcard)'] = false;
    }
  }
  
  return results;
}

/**
 * Тестирует работу iframe postMessage
 * @param iframeElement Элемент iframe
 * @param message Сообщение для отправки
 * @returns true если сообщение отправлено успешно
 */
export function testIframePostMessage(
  iframeElement: HTMLIFrameElement | null,
  message: any
): boolean {
  if (!iframeElement || !iframeElement.contentWindow) {
    console.error('Iframe is not available for testing');
    return false;
  }
  
  const isDevelopment = process.env.NODE_ENV === 'development' || 
                        window.location.hostname === 'localhost';
  
  try {
    // Получаем origin iframe
    let targetOrigin = '*'; // Fallback для режима разработки
    
    try {
      targetOrigin = new URL(iframeElement.src).origin;
    } catch (error) {
      console.warn('Could not parse iframe URL, using wildcard origin:', error);
    }
    
    const testMessage = {
      ...message,
      _source: window.location.origin,
      _timestamp: new Date().toISOString(),
      _test: true
    };
    
    // Отправляем на конкретный origin
    if (targetOrigin !== '*') {
      try {
        iframeElement.contentWindow.postMessage(testMessage, targetOrigin);
        console.log(`Sent test message to iframe at ${targetOrigin}`);
      } catch (error) {
        console.error(`Failed to send message to iframe at ${targetOrigin}:`, error);
        
        // В режиме разработки используем wildcard как fallback
        if (isDevelopment) {
          iframeElement.contentWindow.postMessage(testMessage, '*');
          console.log('[DEV] Sent test message to iframe with wildcard origin');
          return true;
        }
        
        return false;
      }
    } else if (isDevelopment) {
      // В режиме разработки разрешаем использовать wildcard
      iframeElement.contentWindow.postMessage(testMessage, '*');
      console.log('[DEV] Sent test message to iframe with wildcard origin');
    } else {
      console.error('Cannot send to iframe: unknown origin and not in development mode');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in testIframePostMessage:', error);
    return false;
  }
}
