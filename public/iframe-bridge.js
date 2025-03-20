
(function() {
  // Разрешенные домены для коммуникации
  const ALLOWED_ORIGINS = [
    'https://lovable.dev',
    'https://gptengineer.app',
    'https://gptengineer.io',
    'http://localhost:3000',
    'http://localhost:8080',
    'http://localhost:5173'
  ];

  // Проверка разрешенного домена
  function isAllowedOrigin(origin) {
    return ALLOWED_ORIGINS.some(allowed => origin === allowed || origin.startsWith(allowed));
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
    
    // Ваш код обработки сообщения здесь
    
    // Пример ответа
    const response = {
      type: 'response',
      from: 'iframe-bridge',
      received: message,
      timestamp: new Date().toISOString()
    };
    
    // Отправляем ответ обратно отправителю - ВАЖНО: указываем конкретный origin
    event.source.postMessage(response, event.origin);
    console.log(`[iframe-bridge] Sent response to ${event.origin}`);
  });
  
  // Отправляем сообщение о готовности
  function notifyReady() {
    try {
      // Получаем origin родительского окна
      const parentOrigin = document.referrer ? new URL(document.referrer).origin : '*';
      
      window.parent.postMessage(
        { type: 'IFRAME_READY', from: window.location.origin }, 
        parentOrigin
      );
      
      console.log(`[iframe-bridge] Notified ready to ${parentOrigin}`);
      
      // Дополнительно отправляем сообщения в известные домены
      if (parentOrigin === '*') {
        ALLOWED_ORIGINS.forEach(origin => {
          try {
            console.log(`[iframe-bridge] Attempting to notify ${origin}`);
            window.parent.postMessage(
              { type: 'IFRAME_READY', from: window.location.origin },
              origin
            );
          } catch (e) {
            console.warn(`[iframe-bridge] Failed to notify ${origin}:`, e);
          }
        });
      }
    } catch (error) {
      console.error('[iframe-bridge] Error in notifyReady:', error);
      
      // В случае ошибки пробуем отправить сообщение через '*'
      // Это не безопасно, но может помочь в отладке
      try {
        window.parent.postMessage(
          { type: 'IFRAME_READY', from: window.location.origin, error: error.message }, 
          '*'
        );
        console.log('[iframe-bridge] Fallback notification sent to *');
      } catch (e) {
        console.error('[iframe-bridge] Even fallback notification failed:', e);
      }
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
