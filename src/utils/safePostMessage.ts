
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

  // Для локальной разработки - максимально расширенные разрешения
  if (isDevelopment && (
      targetOrigin === '*' ||
      !targetOrigin ||
      targetOrigin.includes('localhost') || 
      window.location.hostname === 'localhost'
  )) {
    try {
      // Добавляем информацию об источнике сообщения
      const enrichedMessage = {
        ...message,
        _source: window.location.origin,
        _timestamp: new Date().toISOString(),
        _debug: true,
        _via: 'safePostMessage-dev'
      };

      console.log(`[DEV] Sending message to ${targetOrigin || 'unknown'}:`, enrichedMessage);
      
      // В режиме разработки сначала пробуем с точным origin, если он известен
      if (targetOrigin && targetOrigin !== '*') {
        try {
          targetWindow.postMessage(enrichedMessage, targetOrigin);
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

  // Проверяем, разрешен ли домен в обычном режиме
  if (!isAllowedOrigin(targetOrigin)) {
    console.error(`Target origin ${targetOrigin} is not in the allowed list`, ALLOWED_ORIGINS);
    
    // В режиме разработки всё равно пробуем отправить для отладки
    if (isDevelopment) {
      try {
        const debugMessage = {
          ...message,
          _source: window.location.origin,
          _timestamp: new Date().toISOString(),
          _debug: true,
          _warning: `Using wildcard origin because ${targetOrigin} is not allowed`,
          _via: 'safePostMessage-fallback'
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
      _timestamp: new Date().toISOString(),
      _via: 'safePostMessage-prod'
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
          _fallback: true,
          _via: 'safePostMessage-emergency'
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
  
  // Улучшенное сообщение с дополнительной информацией
  const baseMessage = {
    ...message,
    _source: window.location.origin,
    _timestamp: new Date().toISOString(),
    _test: true,
    _type: 'CROSS_ORIGIN_TEST',
    _browser: navigator.userAgent,
    _protocol: window.location.protocol,
    _host: window.location.host
  };
  
  // Пробуем отправить сообщение во все разрешенные домены
  console.log('Testing postMessage to all allowed origins:', ALLOWED_ORIGINS);
  ALLOWED_ORIGINS.forEach(origin => {
    // Пропускаем wildcard в продакшене
    if (origin === '*' && !isDevelopment) {
      return;
    }
    
    try {
      console.log(`Attempting to send test message to ${origin}`);
      const enrichedMessage = {
        ...baseMessage,
        _targetOrigin: origin
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
        ...baseMessage,
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
      const iframeSrc = iframeElement.src;
      targetOrigin = new URL(iframeSrc).origin;
      console.log(`Detected iframe origin: ${targetOrigin} from src: ${iframeSrc}`);
    } catch (error) {
      console.warn('Could not parse iframe URL, using wildcard origin:', error);
    }
    
    // Улучшенное тестовое сообщение с метаданными
    const testMessage = {
      ...message,
      _source: window.location.origin,
      _timestamp: new Date().toISOString(),
      _test: true,
      _iframeTest: true,
      _iframeSrc: iframeElement.src,
      _protocol: window.location.protocol,
      _via: 'testIframePostMessage'
    };
    
    console.log(`Testing iframe message with target: ${targetOrigin}`, testMessage);
    
    // Стратегия отправки в зависимости от режима и распознанного origin
    if (targetOrigin !== '*' && targetOrigin) {
      try {
        // Пробуем отправить по точному origin
        iframeElement.contentWindow.postMessage(testMessage, targetOrigin);
        console.log(`Sent test message to iframe at ${targetOrigin}`);
        
        // В режиме разработки также отправляем с wildcard и на ключевые домены
        if (isDevelopment) {
          // Дублируем с wildcard
          iframeElement.contentWindow.postMessage(testMessage, '*');
          console.log('[DEV] Also sent with wildcard for compatibility');
          
          // Пробуем отправить на все разрешенные домены
          for (const origin of ALLOWED_ORIGINS) {
            if (origin !== '*' && origin !== targetOrigin) {
              try {
                iframeElement.contentWindow.postMessage({
                  ...testMessage,
                  _targetOrigin: origin,
                }, origin);
              } catch (e) {
                // Игнорируем ошибки в режиме отладки
              }
            }
          }
        }
        
        return true;
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
    } else if (isDevelopment || targetOrigin === '*') {
      // В режиме разработки или если origin не определен, используем wildcard
      iframeElement.contentWindow.postMessage(testMessage, '*');
      console.log('[DEV] Sent test message to iframe with wildcard origin');
      
      // Также пробуем отправить на все разрешенные домены
      for (const origin of ALLOWED_ORIGINS) {
        if (origin !== '*') {
          try {
            iframeElement.contentWindow.postMessage({
              ...testMessage,
              _targetOrigin: origin,
            }, origin);
          } catch (e) {
            // Игнорируем ошибки при мультидоменной отправке в режиме отладки
          }
        }
      }
      
      return true;
    } else {
      console.error('Cannot send to iframe: unknown origin and not in development mode');
      return false;
    }
  } catch (error) {
    console.error('Error in testIframePostMessage:', error);
    return false;
  }
}
