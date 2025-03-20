
import { ALLOWED_ORIGINS } from '@/services/gpt/config/GPTServiceConfig';
import { isDevelopmentMode } from './constants';

/**
 * Тестирует постмессенджи для всех известных доменов
 * @param message Сообщение для отправки
 * @returns Объект с результатами отправки
 */
export function testPostMessageAllOrigins(message: any): Record<string, boolean> {
  const results: Record<string, boolean> = {};
  const isDevelopment = isDevelopmentMode(window);
  
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
  
  const isDevelopment = isDevelopmentMode(window);
  
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

