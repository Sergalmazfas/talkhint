
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
  
  // Счетчик отправленных сообщений для предотвращения зацикливания
  let messageCounter = 0;
  const MAX_MESSAGES = 100;

  // Проверка разрешенного домена
  function isAllowedOrigin(origin) {
    if (DEBUG_MODE) return true; // В режиме отладки пропускаем все домены
    if (!origin) return true; // Разрешаем пустой origin для тестирования
    if (origin.includes('localhost')) return true; // Всегда разрешаем localhost
    if (origin.includes('lovable.')) return true; // Всегда разрешаем домены lovable
    if (origin.includes('gptengineer.')) return true; // Всегда разрешаем домены gptengineer
    
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

  // Хранение уже полученных сообщений для предотвращения дублирования обработки
  const processedMessages = new Set();
  
  // Защита от зацикливания постоянной отправки сообщений
  function isMessageProcessed(event) {
    // Создаем уникальный хеш-ключ для сообщения на основе его содержимого и источника
    const messageData = JSON.stringify(event.data);
    const messageKey = `${event.origin}:${messageData}`;
    
    // Проверяем, не обрабатывали ли мы уже это сообщение
    if (processedMessages.has(messageKey)) {
      return true;
    }
    
    // Добавляем сообщение в список обработанных
    processedMessages.add(messageKey);
    
    // Ограничиваем размер кэша обработанных сообщений
    if (processedMessages.size > 200) {
      // Удаляем самые старые сообщения
      const iterator = processedMessages.values();
      for (let i = 0; i < 50; i++) {
        processedMessages.delete(iterator.next().value);
      }
    }
    
    return false;
  }

  // Отладка всех сообщений независимо от origin
  window.addEventListener('message', function(event) {
    console.log(`[DEBUG] Raw message from ${event.origin}:`, event.data);
  }, true);

  // Улучшенная обработка сообщений от разрешенных domains
  window.addEventListener('message', function(event) {
    try {
      // Защита от зацикливания: если счетчик превышает MAX_MESSAGES, перестаем обрабатывать
      if (messageCounter > MAX_MESSAGES) {
        console.error(`[SAFETY] Too many messages processed (${messageCounter}). Stopping to prevent infinite loop.`);
        return;
      }
      
      // Проверяем, не обрабатывали ли мы уже это сообщение
      if (isMessageProcessed(event)) {
        return;
      }
      
      messageCounter++;
      console.log(`Processing message #${messageCounter} from ${event.origin}:`, event.data);
      
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
        timestamp: new Date().toISOString(),
        messageCount: messageCounter
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
        if (event.origin) {
          try {
            event.source.postMessage(response, event.origin);
            console.log(`Sent response to specific origin: ${event.origin}`);
          } catch (e) {
            console.warn(`Failed to respond to specific origin:`, e);
          }
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });
  
  // Уведомление родительского окна, что iframe готов
  function notifyReady() {
    // Проверяем, доступно ли parent окно и можем ли мы отправлять сообщения
    if (!window.parent || !window.parent.postMessage) {
      console.warn('Parent window is not accessible for postMessage');
      return;
    }
    
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
  
  // Функция для перехвата ошибок React
  function listenForReactErrors() {
    const originalError = console.error;
    console.error = function(...args) {
      originalError.apply(console, args);
      
      const errorStr = args.join(' ');
      if (errorStr.includes('React error') || errorStr.includes('minified React') || errorStr.includes('Error #301')) {
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
