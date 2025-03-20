
(function() {
  // Расширенный список разрешенных доменов
  const ALLOWED_ORIGINS = [
    'https://lovable.dev',
    'https://www.lovable.dev',
    'http://lovable.dev',
    'http://www.lovable.dev',
    'https://id-preview--be5c3e65-2457-46cb-a8e0-02444f6fdcc1.lovable.app',
    'https://id-preview--be5c3e65-2457-46cb-a8e0-02444f6fdcc1.lovable.app:3000',
    'https://gptengineer.app',
    'https://www.gptengineer.app',
    'http://gptengineer.app',
    'http://www.gptengineer.app',
    'https://gptengineer.io',
    'https://www.gptengineer.io',
    'http://gptengineer.io',
    'http://www.gptengineer.io',
    'http://localhost:3000',
    'https://localhost:3000',
    'http://localhost:8080',
    'https://localhost:8080',
    'http://localhost:5173',
    'https://localhost:5173',
    'http://localhost',
    'https://localhost'
  ];

  // Всегда принимать сообщения в режиме отладки
  const DEBUG_MODE = true;

  // Проверка разрешенного домена
  function isAllowedOrigin(origin) {
    if (DEBUG_MODE) return true; // В режиме отладки пропускаем все домены
    if (!origin) return true; // Разрешаем пустой origin для тестирования
    if (origin.includes('localhost')) return true; // Всегда разрешаем localhost
    if (origin.includes('lovable.')) return true; // Всегда разрешаем домены lovable
    
    // Нормализация доменов для сравнения
    const normalizeOrigin = (url) => {
      try {
        return url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/:\d+$/, '').toLowerCase();
      } catch (e) {
        console.error("Error normalizing origin:", e);
        return url.toLowerCase();
      }
    };
    
    const normalizedOrigin = normalizeOrigin(origin);
    return ALLOWED_ORIGINS.some(allowed => normalizeOrigin(allowed) === normalizedOrigin);
  }

  // Отладка всех сообщений независимо от origin
  window.addEventListener('message', function(event) {
    console.log(`[DEBUG] Raw message from ${event.origin}:`, event.data);
  }, true);

  // Улучшенная обработка сообщений от разрешенных domains
  window.addEventListener('message', function(event) {
    try {
      console.log(`Processing message from ${event.origin}:`, event.data);
      
      // Проверяем ошибку React #301
      if (event.data && event.data.type === 'REACT_ERROR') {
        console.error('React Error detected:', event.data.error);
        // Здесь можно добавить дополнительную обработку ошибок React
      }
      
      // Создаем ответное сообщение
      const response = {
        type: 'IFRAME_RESPONSE',
        action: 'response',
        received: event.data,
        from: window.location.origin,
        timestamp: new Date().toISOString()
      };
      
      // Отправка ответа разными способами
      if (event.source) {
        // Пробуем wildcard (наиболее надежный для тестирования)
        try {
          event.source.postMessage(response, '*');
          console.log('Sent response using wildcard origin');
        } catch (e) {
          console.error('Wildcard response failed:', e);
        }
        
        // Пробуем конкретный origin
        try {
          event.source.postMessage(response, event.origin);
          console.log(`Sent response to specific origin: ${event.origin}`);
        } catch (e) {
          console.warn(`Failed to respond to specific origin:`, e);
        }
        
        // Пробуем все известные домены
        ALLOWED_ORIGINS.forEach(origin => {
          if (origin !== '*' && origin !== event.origin) {
            try {
              event.source.postMessage({
                ...response,
                note: `Cross-domain response attempt to ${origin}`
              }, origin);
            } catch (e) {
              // Молча игнорируем ошибки в кросс-доменных попытках
            }
          }
        });
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });
  
  // Уведомление родительского окна, что iframe готов
  function notifyReady() {
    try {
      const readyMessage = { 
        type: 'IFRAME_READY', 
        from: window.location.origin,
        url: window.location.href,
        timestamp: new Date().toISOString()
      };
      
      // Отправка со всеми доступными методами
      
      // Через wildcard (наиболее надежный)
      window.parent.postMessage(readyMessage, '*');
      console.log('Sent ready notification with wildcard origin');
      
      // Через конкретный parent, если доступен
      if (document.referrer) {
        try {
          const parentOrigin = new URL(document.referrer).origin;
          window.parent.postMessage(readyMessage, parentOrigin);
          console.log(`Sent ready notification to specific parent: ${parentOrigin}`);
        } catch (e) {
          console.warn('Failed to notify specific parent:', e);
        }
      }
      
      // Пробуем все известные домены
      ALLOWED_ORIGINS.forEach(origin => {
        if (origin !== '*') {
          try {
            window.parent.postMessage({
              ...readyMessage,
              note: `Cross-domain ready notification to ${origin}`
            }, origin);
          } catch (e) {
            // Молча игнорируем ошибки
          }
        }
      });
    } catch (error) {
      console.error('Error in notifyReady:', error);
    }
  }
  
  // Отправка уведомления о готовности
  if (document.readyState === 'complete') {
    notifyReady();
  } else {
    window.addEventListener('load', notifyReady);
  }
  
  // Также отправляем после небольшой задержки (для надежности)
  setTimeout(notifyReady, 500);
  setTimeout(notifyReady, 1500); // Повторная попытка с большей задержкой
  
  // Принудительное переопределение postMessage для совместимости
  try {
    const originalPostMessage = window.postMessage;
    window.postMessage = function(message, targetOrigin, transfer) {
      // Всегда логируем попытки postMessage для отладки
      console.log(`[override] window.postMessage called with origin: ${targetOrigin}`, message);
      
      // Всегда добавляем метку времени и источник
      const enhancedMessage = {
        ...message,
        _enhanced: true,
        _timestamp: new Date().toISOString(),
        _source: window.location.origin
      };
      
      try {
        // Сначала пробуем с указанным targetOrigin
        originalPostMessage.call(window, enhancedMessage, targetOrigin, transfer);
        
        // В режиме отладки также дублируем с wildcard
        if (DEBUG_MODE && targetOrigin !== '*') {
          originalPostMessage.call(window, enhancedMessage, '*', transfer);
        }
      } catch (e) {
        console.error(`[override] Error in postMessage to ${targetOrigin}:`, e);
        
        // В случае ошибки пробуем с wildcard
        if (targetOrigin !== '*') {
          try {
            originalPostMessage.call(window, enhancedMessage, '*', transfer);
            console.log('[override] Fallback to wildcard origin succeeded');
          } catch (fallbackError) {
            console.error('[override] Even fallback failed:', fallbackError);
          }
        }
      }
    };
  } catch (e) {
    console.error('Could not override postMessage:', e);
  }
  
  // Функция для перехвата ошибок React
  function listenForReactErrors() {
    const originalError = console.error;
    console.error = function(...args) {
      originalError.apply(console, args);
      
      const errorStr = args.join(' ');
      if (errorStr.includes('React error') || errorStr.includes('minified React')) {
        try {
          // Отправляем сообщение об ошибке родительскому окну
          window.parent.postMessage({
            type: 'REACT_ERROR',
            error: errorStr,
            timestamp: new Date().toISOString(),
            location: window.location.href
          }, '*');
          console.log('Reported React error to parent window');
        } catch (e) {
          console.warn('Failed to report React error:', e);
        }
      }
    };
  }
  
  // Активируем перехват ошибок React
  listenForReactErrors();
  
  console.log('iframe-bridge.js initialized with DEBUG_MODE:', DEBUG_MODE);
})();
