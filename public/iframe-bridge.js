
(function() {
  // Разрешенные домены для коммуникации - расширенный список
  const ALLOWED_ORIGINS = [
    'https://lovable.dev',
    'https://gptengineer.app',
    'https://gptengineer.io',
    'http://localhost:3000',
    'https://localhost:3000', // Добавляем HTTPS версию
    'http://localhost:8080',
    'http://localhost:5173',
    '*' // Временно разрешаем любой домен для отладки
  ];

  // Проверка разрешенного домена - более гибкая
  function isAllowedOrigin(origin) {
    // В режиме разработки разрешаем localhost
    if (origin.includes('localhost') || origin === '*') {
      return true;
    }
    
    // Для остальных доменов проверяем по списку
    return ALLOWED_ORIGINS.some(allowed => 
      origin === allowed || origin.startsWith(allowed)
    );
  }

  // Обработчик сообщений
  window.addEventListener('message', function(event) {
    // Проверяем, разрешен ли источник сообщения
    if (!isAllowedOrigin(event.origin)) {
      console.warn(`[iframe-bridge] Message from disallowed origin rejected: ${event.origin}`);
      return;
    }

    const message = event.data;
    
    // Логирование полученного сообщения
    console.log(`[iframe-bridge] Received message from ${event.origin}:`, message);
    
    // Обработка сообщения
    try {
      // В режиме разработки принимаем любые сообщения
      const isDevelopment = 
        window.location.hostname === 'localhost' || 
        document.referrer.includes('localhost');
      
      // Пример ответа
      const response = {
        type: 'response',
        from: 'iframe-bridge',
        received: message,
        timestamp: new Date().toISOString(),
        environment: isDevelopment ? 'development' : 'production'
      };
      
      // Отправляем ответ обратно отправителю
      if (event.source) {
        try {
          // Сначала пробуем отправить на конкретный origin
          event.source.postMessage(response, event.origin);
          console.log(`[iframe-bridge] Sent response to ${event.origin}`);
        } catch (e) {
          console.warn(`[iframe-bridge] Failed to respond to ${event.origin}:`, e);
          
          // Если не получилось, пробуем с любым origin (для отладки)
          if (isDevelopment) {
            event.source.postMessage(response, '*');
            console.log('[iframe-bridge] Sent response using wildcard origin (debug mode)');
          }
        }
      }
    } catch (error) {
      console.error('[iframe-bridge] Error processing message:', error);
    }
  });
  
  // Отправляем сообщение о готовности
  function notifyReady() {
    try {
      // Безопасно получаем origin родительского окна
      let parentOrigin = '*'; // Fallback для отладки
      
      try {
        if (document.referrer) {
          parentOrigin = new URL(document.referrer).origin;
        }
      } catch (e) {
        console.warn('[iframe-bridge] Could not parse referrer:', e);
      }
      
      // Отправляем сообщение родительскому окну
      const readyMessage = { 
        type: 'IFRAME_READY', 
        from: window.location.origin,
        url: window.location.href,
        timestamp: new Date().toISOString()
      };
      
      // Отправляем на конкретный домен, если он известен
      if (parentOrigin !== '*') {
        try {
          window.parent.postMessage(readyMessage, parentOrigin);
          console.log(`[iframe-bridge] Notified ready to ${parentOrigin}`);
        } catch (e) {
          console.warn(`[iframe-bridge] Failed to notify ${parentOrigin}:`, e);
        }
      }
      
      // Дополнительно отправляем сообщение с wildcard origin для отладки
      try {
        window.parent.postMessage(readyMessage, '*');
        console.log('[iframe-bridge] Sent wildcard ready notification');
      } catch (e) {
        console.error('[iframe-bridge] Even wildcard notification failed:', e);
      }
      
      // Дополнительно пробуем отправить на все известные домены
      for (const origin of ALLOWED_ORIGINS) {
        if (origin !== '*') {
          try {
            window.parent.postMessage(readyMessage, origin);
            console.log(`[iframe-bridge] Sent ready notification to ${origin}`);
          } catch (e) {
            // Игнорируем ошибки при отправке на другие домены
          }
        }
      }
    } catch (error) {
      console.error('[iframe-bridge] Error in notifyReady:', error);
    }
  }
  
  // Уведомляем родительское окно, что iframe загружен и готов к коммуникации
  if (document.readyState === 'complete') {
    notifyReady();
  } else {
    window.addEventListener('load', notifyReady);
  }
  
  console.log('[iframe-bridge] Initialized successfully');
})();
