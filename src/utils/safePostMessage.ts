
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

  // Проверяем, разрешен ли домен
  if (!isAllowedOrigin(targetOrigin)) {
    console.error(`Target origin ${targetOrigin} is not in the allowed list`, ALLOWED_ORIGINS);
    return false;
  }

  try {
    // Добавляем информацию об источнике сообщения
    const enrichedMessage = {
      ...message,
      _source: window.location.origin
    };

    // Отправляем сообщение
    targetWindow.postMessage(enrichedMessage, targetOrigin);
    return true;
  } catch (error) {
    console.error('Error posting message:', error);
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
  // Проверяем, разрешен ли источник сообщения
  if (!event.origin || !isAllowedOrigin(event.origin)) {
    console.warn(`Message from disallowed origin rejected: ${event.origin}`);
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
    handleSafePostMessage(event, (data) => callback(data, event.origin));
  };

  window.addEventListener('message', messageHandler);
  
  // Возвращаем функцию очистки
  return () => {
    window.removeEventListener('message', messageHandler);
  };
}
