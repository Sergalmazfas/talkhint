
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

  // Подробное логирование для отладки
  console.log(`[safePostMessage] Attempting to send message to ${targetOrigin || 'unknown'}`);
  console.log(`[safePostMessage] Current origin: ${window.location.origin}`);
  
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

  // BYPASS FOR TESTING: Allow all origins temporarily
  // Remove or set to false for production
  const bypassOriginCheck = true;

  // Проверяем, разрешен ли домен в обычном режиме
  const allowed = bypassOriginCheck || isAllowedOrigin(targetOrigin);
  console.log(`[safePostMessage] Target origin ${targetOrigin} allowed: ${allowed} (bypass: ${bypassOriginCheck})`);
  
  if (!allowed) {
    console.error(`Target origin ${targetOrigin} is not in the allowed list`, ALLOWED_ORIGINS);
    
    // В режиме разработки всё равно пробуем отправить для отладки
    if (isDevelopment || bypassOriginCheck) {
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
    
    return false;
  }

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
    if (isDevelopment || bypassOriginCheck) {
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
    if (isDevelopment || bypassOriginCheck) {
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
                        
  // BYPASS FOR TESTING: Allow all origins temporarily
  // Remove or set to false for production
  const bypassOriginCheck = true;

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
  if ((isDevelopment || bypassOriginCheck) && (
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
  const allowed = bypassOriginCheck || (event.origin && isAllowedOrigin(event.origin));
  if (!allowed) {
    console.warn(`Message from disallowed origin rejected: ${event.origin || 'unknown'}`);
    
    // В режиме разработки всё равно логируем содержимое
    if (isDevelopment || bypassOriginCheck) {
      console.log(`[DEV] Rejected message content:`, event.data);
      
      // In testing mode, process anyway
      if (bypassOriginCheck) {
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

/**
 * Настраивает безопасный обработчик сообщений postMessage
 * @param callback Функция обработки сообщения
 * @returns Функция для удаления обработчика
 */
export function setupMessageListener(
  callback: (data: any, origin: string) => void
): () => void {
  // Debug listener to see ALL messages regardless of origin
  const debugHandler = (event: MessageEvent) => {
    console.log(`[DEBUG] Raw message received from ${event.origin || 'unknown'}:`, event.data);
  };
  window.addEventListener('message', debugHandler, true); // Use capture phase

  const messageHandler = (event: MessageEvent) => {
    const originDisplay = event.origin || 'unknown';
    const isDevelopment = process.env.NODE_ENV === 'development' || 
                          window.location.hostname === 'localhost';
    
    // BYPASS FOR TESTING: Allow all origins temporarily
    // Remove or set to false for production
    const bypassOriginCheck = true;
    
    // Проверка того же окна
    if (event.source === window) {
      callback(event.data, 'same-window');
      return;
    }
    
    // Special case for lovable.app subdomains
    if (event.origin && event.origin.includes('lovable.app')) {
      console.log(`[setupMessageListener] Allowing lovable.app subdomain: ${event.origin}`);
      callback(event.data, event.origin);
      return;
    }
    
    // В режиме разработки принимаем все сообщения для отладки
    if ((isDevelopment || bypassOriginCheck) && (
      originDisplay.includes('localhost') || 
      window.location.hostname === 'localhost'
    )) {
      console.log(`[DEV] Received message from ${originDisplay}`);
      callback(event.data, originDisplay);
      return;
    }
    
    // Проверяем, разрешен ли источник сообщения
    const allowed = bypassOriginCheck || (event.origin && isAllowedOrigin(event.origin));
    if (!allowed) {
      console.warn(`Message from disallowed origin: ${originDisplay}`);
      
      // В режиме разработки всё равно показываем содержимое
      if (isDevelopment) {
        console.log(`[DEV] Rejected message content from ${originDisplay}:`, event.data);
      }
      
      // In testing mode, process anyway
      if (bypassOriginCheck) {
        console.log('[BYPASS] Processing message despite origin check failure');
        callback(event.data, originDisplay);
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
    window.removeEventListener('message', debugHandler, true);
    console.log('PostMessage listeners removed');
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
  
  // Расширенное логирование для отладки
  console.log('[testPostMessageAllOrigins] Testing to all origins:', ALLOWED_ORIGINS);
  console.log('[testPostMessageAllOrigins] Current origin:', window.location.origin);
  
  // Пробуем отправить сообщение во все разрешенные домены
  ALLOWED_ORIGINS.forEach(origin => {
    // Пропускаем wildcard в продакшене
    if (origin === '*' && !isDevelopment) {
      return;
    }
    
    try {
      console.log(`[testPostMessageAllOrigins] Attempting to send to ${origin}`);
      const enrichedMessage = {
        ...baseMessage,
        _targetOrigin: origin
      };
      
      window.parent.postMessage(enrichedMessage, origin);
      console.log(`[testPostMessageAllOrigins] Sent to ${origin}`);
      results[origin] = true;
    } catch (error) {
      console.error(`[testPostMessageAllOrigins] Failed to send to ${origin}:`, error);
      results[origin] = false;
    }
  });
  
  // В режиме разработки также тестируем с wildcard
  if (isDevelopment) {
    try {
      console.log(`[testPostMessageAllOrigins] Attempting with wildcard`);
      const enrichedMessage = {
        ...baseMessage,
        _wildcard: true
      };
      
      window.parent.postMessage(enrichedMessage, '*');
      console.log(`[testPostMessageAllOrigins] Sent with wildcard`);
      results['* (wildcard)'] = true;
    } catch (error) {
      console.error(`[testPostMessageAllOrigins] Failed with wildcard:`, error);
      results['* (wildcard)'] = false;
    }
  }
  
  return results;
}

/**
 * Тестирует работу iframe postMessage с расширенным логированием
 * @param iframeElement Элемент iframe
 * @param message Сообщение для отправки
 * @returns true если сообщение отправлено успешно
 */
export function testIframePostMessage(
  iframeElement: HTMLIFrameElement | null,
  message: any
): boolean {
  if (!iframeElement || !iframeElement.contentWindow) {
    console.error('[testIframePostMessage] Iframe is not available for testing');
    return false;
  }
  
  const isDevelopment = process.env.NODE_ENV === 'development' || 
                        window.location.hostname === 'localhost';
  
  console.log('[testIframePostMessage] Testing iframe communication');
  console.log('[testIframePostMessage] Iframe src:', iframeElement.src);
  
  try {
    // Получаем origin iframe
    let targetOrigin = '*'; // Fallback для режима разработки
    
    try {
      const iframeSrc = iframeElement.src;
      targetOrigin = new URL(iframeSrc).origin;
      console.log(`[testIframePostMessage] Detected iframe origin: ${targetOrigin} from src: ${iframeSrc}`);
    } catch (error) {
      console.warn('[testIframePostMessage] Could not parse iframe URL, using wildcard:', error);
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
    
    console.log(`[testIframePostMessage] With target: ${targetOrigin}`, testMessage);
    
    // Отправка сообщения с использованием всех возможных origin
    let successCount = 0;
    
    // Сначала пробуем с конкретным origin
    if (targetOrigin !== '*' && targetOrigin) {
      try {
        iframeElement.contentWindow.postMessage(testMessage, targetOrigin);
        console.log(`[testIframePostMessage] Sent to specific origin: ${targetOrigin}`);
        successCount++;
      } catch (e) {
        console.warn(`[testIframePostMessage] Failed with specific origin:`, e);
      }
    }
    
    // Всегда пробуем с wildcard в режиме разработки
    if (isDevelopment) {
      try {
        iframeElement.contentWindow.postMessage(testMessage, '*');
        console.log(`[testIframePostMessage] Sent with wildcard origin`);
        successCount++;
      } catch (e) {
        console.warn(`[testIframePostMessage] Failed with wildcard:`, e);
      }
    }
    
    // Пробуем отправить на все разрешенные домены
    for (const origin of ALLOWED_ORIGINS) {
      if (origin !== '*' && origin !== targetOrigin) {
        try {
          iframeElement.contentWindow.postMessage({
            ...testMessage,
            _targetOrigin: origin,
          }, origin);
          console.log(`[testIframePostMessage] Sent to ${origin}`);
          successCount++;
        } catch (e) {
          // Логируем ошибки только в режиме отладки
          if (isDevelopment) {
            console.warn(`[testIframePostMessage] Failed to ${origin}:`, e);
          }
        }
      }
    }
    
    console.log(`[testIframePostMessage] Total successful sends: ${successCount}`);
    return successCount > 0;
  } catch (error) {
    console.error('[testIframePostMessage] Error:', error);
    return false;
  }
}
