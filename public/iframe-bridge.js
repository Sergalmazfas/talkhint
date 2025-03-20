
(function() {
  // Расширенные разрешенные домены для коммуникации
  const ALLOWED_ORIGINS = [
    'https://lovable.dev',
    'https://www.lovable.dev',
    'https://gptengineer.app',
    'https://www.gptengineer.app',
    'https://gptengineer.io',
    'https://www.gptengineer.io',
    'http://localhost:3000',
    'https://localhost:3000',
    'http://localhost:8080',
    'https://localhost:8080',
    'http://localhost:5173',
    'https://localhost:5173',
    '*' // Временно разрешаем любой домен для отладки
  ];

  // Улучшенная проверка разрешенного домена с подробным логированием
  function isAllowedOrigin(origin) {
    console.log(`[iframe-bridge] Checking if origin is allowed: ${origin}`);
    
    // Если origin пустой или отсутствует, разрешаем для отладки
    if (!origin) {
      console.log('[iframe-bridge] Empty origin, allowing for debugging');
      return true;
    }
    
    // В режиме разработки разрешаем localhost
    if (origin.includes('localhost')) {
      console.log('[iframe-bridge] Localhost origin detected, allowing');
      return true;
    }
    
    if (origin === '*') {
      console.log('[iframe-bridge] Wildcard origin, allowing');
      return true;
    }
    
    // Проверка www/без www вариантов (например, lovable.dev и www.lovable.dev)
    const normalizedOrigin = origin.replace('www.', '');
    console.log(`[iframe-bridge] Normalized origin: ${normalizedOrigin}`);
    
    // Для остальных доменов проверяем по списку с нормализацией
    const isAllowed = ALLOWED_ORIGINS.some(allowed => {
      if (allowed === '*') return true;
      return allowed.replace('www.', '') === normalizedOrigin;
    });
    
    console.log(`[iframe-bridge] Origin ${origin} allowed: ${isAllowed}`);
    return isAllowed;
  }

  // Обработчик сообщений - улучшенная версия с детальным логированием
  window.addEventListener('message', function(event) {
    // Подробное логирование origin
    console.log(`[iframe-bridge] Received message from ${event.origin || 'unknown origin'}`);
    
    // Проверяем, разрешен ли источник сообщения
    const isAllowed = isAllowedOrigin(event.origin);
    console.log(`[iframe-bridge] Message from ${event.origin}, allowed: ${isAllowed}`);
    
    if (!isAllowed) {
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
      
      // Создаем ответное сообщение с расширенными метаданными
      const response = {
        type: 'IFRAME_RESPONSE',
        action: 'response',
        from: 'iframe-bridge',
        received: message,
        timestamp: new Date().toISOString(),
        environment: isDevelopment ? 'development' : 'production',
        url: window.location.href,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        protocol: window.location.protocol
      };
      
      // Отправляем ответ обратно отправителю
      if (event.source) {
        console.log(`[iframe-bridge] Attempting to respond to ${event.origin}`);
        
        try {
          // Сначала пробуем отправить на конкретный origin
          event.source.postMessage(response, event.origin);
          console.log(`[iframe-bridge] Sent response to ${event.origin}`);
        } catch (e) {
          console.warn(`[iframe-bridge] Failed to respond to ${event.origin}:`, e);
          
          // Если не получилось, пробуем с любым origin (для отладки)
          try {
            event.source.postMessage(response, '*');
            console.log('[iframe-bridge] Sent response using wildcard origin');
          } catch (e2) {
            console.error('[iframe-bridge] Failed to send even with wildcard:', e2);
          }
          
          // Пробуем отправить на все известные домены
          for (const origin of ALLOWED_ORIGINS) {
            if (origin !== '*' && origin !== event.origin) {
              try {
                event.source.postMessage({
                  ...response,
                  _targetOrigin: origin,
                  _note: 'Multi-origin fallback'
                }, origin);
                console.log(`[iframe-bridge] Tried fallback response to ${origin}`);
              } catch (e3) {
                // Игнорируем ошибки при мультидоменной отправке
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('[iframe-bridge] Error processing message:', error);
    }
  });
  
  // Отправляем сообщение о готовности - улучшенная версия
  function notifyReady() {
    try {
      // Безопасно получаем origin родительского окна
      let parentOrigin = '*'; // Fallback для отладки
      
      try {
        if (document.referrer) {
          parentOrigin = new URL(document.referrer).origin;
          console.log(`[iframe-bridge] Detected parent origin from referrer: ${parentOrigin}`);
        }
      } catch (e) {
        console.warn('[iframe-bridge] Could not parse referrer:', e);
      }
      
      // Создаем сообщение о готовности с расширенными метаданными
      const readyMessage = { 
        type: 'IFRAME_READY', 
        from: window.location.origin,
        url: window.location.href,
        referrer: document.referrer,
        timestamp: new Date().toISOString(),
        protocol: window.location.protocol,
        userAgent: navigator.userAgent,
        readyState: document.readyState
      };
      
      console.log(`[iframe-bridge] Preparing to notify ready, parent: ${parentOrigin}`);
      
      // Стратегия многоадресной отправки
      // 1. Сначала пробуем отправить на конкретный домен, если он известен
      if (parentOrigin !== '*') {
        try {
          window.parent.postMessage(readyMessage, parentOrigin);
          console.log(`[iframe-bridge] Notified ready to specific parent: ${parentOrigin}`);
        } catch (e) {
          console.warn(`[iframe-bridge] Failed to notify specific parent:`, e);
        }
      }
      
      // 2. Затем отправляем сообщение с wildcard origin
      try {
        window.parent.postMessage({...readyMessage, _wildcard: true}, '*');
        console.log('[iframe-bridge] Sent wildcard ready notification');
      } catch (e) {
        console.error('[iframe-bridge] Wildcard notification failed:', e);
      }
      
      // 3. Дополнительно пробуем отправить на все известные домены
      for (const origin of ALLOWED_ORIGINS) {
        if (origin !== '*' && origin !== parentOrigin) {
          try {
            window.parent.postMessage({
              ...readyMessage, 
              _targetOrigin: origin,
              _broadcast: true
            }, origin);
            console.log(`[iframe-bridge] Sent broadcast notification to ${origin}`);
          } catch (e) {
            // Игнорируем ошибки при мультидоменной отправке
          }
        }
      }
      
      // 4. Для режима разработки добавляем информацию в DOM
      if (window.location.hostname === 'localhost' || window.location.hostname.includes('localhost')) {
        const debugInfo = document.createElement('div');
        debugInfo.style.position = 'fixed';
        debugInfo.style.bottom = '10px';
        debugInfo.style.right = '10px';
        debugInfo.style.background = 'rgba(0,0,0,0.7)';
        debugInfo.style.color = 'white';
        debugInfo.style.padding = '5px';
        debugInfo.style.borderRadius = '3px';
        debugInfo.style.fontSize = '10px';
        debugInfo.style.zIndex = '9999';
        debugInfo.innerHTML = `
          <div>Origin: ${window.location.origin}</div>
          <div>Parent: ${parentOrigin || 'unknown'}</div>
          <div>Protocol: ${window.location.protocol}</div>
          <div>Ready notifications sent</div>
          <div>Allowed origins: ${ALLOWED_ORIGINS.join(', ')}</div>
        `;
        document.body.appendChild(debugInfo);
      }
    } catch (error) {
      console.error('[iframe-bridge] Error in notifyReady:', error);
    }
  }
  
  // Уведомляем родительское окно, что iframe загружен и готов
  // Используем более надежный подход с несколькими попытками
  if (document.readyState === 'complete') {
    notifyReady();
  } else {
    window.addEventListener('load', notifyReady);
    
    // Дополнительно пробуем отправить уведомление через определенные интервалы
    // для обхода проблем с загрузкой в разных браузерах
    setTimeout(notifyReady, 500);
    setTimeout(notifyReady, 1000);
    setTimeout(notifyReady, 3000);
  }
  
  // Слушаем события DOMContentLoaded как еще один триггер
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(notifyReady, 100);
  });
  
  console.log('[iframe-bridge] Initialized successfully with origins:', ALLOWED_ORIGINS);
})();
