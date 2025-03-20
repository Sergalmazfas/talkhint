
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
    return ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed));
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
    
    // Отправляем ответ обратно отправителю
    if (isAllowedOrigin(event.origin)) {
      event.source.postMessage(response, event.origin);
      console.log(`[iframe-bridge] Sent response to ${event.origin}`);
    }
  });
  
  // Отправляем сообщение о готовности
  function notifyReady() {
    const parentOrigin = document.referrer ? new URL(document.referrer).origin : '*';
    if (parentOrigin === '*' || isAllowedOrigin(parentOrigin)) {
      window.parent.postMessage({ type: 'IFRAME_READY', from: window.location.origin }, parentOrigin);
      console.log(`[iframe-bridge] Notified ready to ${parentOrigin}`);
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
