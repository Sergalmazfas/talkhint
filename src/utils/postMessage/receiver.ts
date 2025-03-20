
import { isDevelopmentMode, BYPASS_ORIGIN_CHECK } from './constants';
import { isSafeMessageOrigin } from './validators';

// Сет для отслеживания уже обработанных сообщений (защита от зацикливания)
const processedMessages = new Set<string>();
const MAX_PROCESSED_MESSAGES = 200; // Максимальный размер кэша обработанных сообщений

/**
 * Class that safely handles postMessage events
 */
export class SafeMessageReceiver {
  private window: Window;
  private handlers: Array<(event: MessageEvent) => void> = [];
  private isListening: boolean = false;
  private boundListener: (event: MessageEvent) => void;
  private messageCount: number = 0;
  private readonly MAX_MESSAGES_PER_SECOND = 30;
  private messageTimestamps: number[] = [];

  constructor(window: Window) {
    this.window = window;
    this.boundListener = this.handleMessage.bind(this);
  }

  /**
   * Add a message handler function
   * @param handler Function to call when a safe message is received
   */
  public addHandler(handler: (event: MessageEvent) => void): void {
    // Проверяем, не добавлен ли уже этот обработчик
    if (this.handlers.includes(handler)) {
      console.warn('[SafeMessageReceiver] Handler already added, skipping duplicate');
      return;
    }
    
    this.handlers.push(handler);
    
    // Start listening if not already
    if (!this.isListening) {
      this.startListening();
    }
  }

  /**
   * Remove a previously added handler
   * @param handler The handler to remove
   */
  public removeHandler(handler: (event: MessageEvent) => void): void {
    this.handlers = this.handlers.filter(h => h !== handler);
    
    // Stop listening if no handlers left
    if (this.handlers.length === 0) {
      this.stopListening();
    }
  }

  /**
   * Start listening for messages
   */
  private startListening(): void {
    if (!this.isListening) {
      this.window.addEventListener('message', this.boundListener);
      this.isListening = true;
      console.log('[SafeMessageReceiver] Started listening for messages');
    }
  }

  /**
   * Stop listening for messages
   */
  private stopListening(): void {
    if (this.isListening) {
      this.window.removeEventListener('message', this.boundListener);
      this.isListening = false;
      console.log('[SafeMessageReceiver] Stopped listening for messages');
    }
  }

  /**
   * Проверяет, не обрабатывалось ли уже это сообщение
   * @param event Сообщение для проверки
   * @returns true если сообщение уже обрабатывалось
   */
  private isMessageProcessed(event: MessageEvent): boolean {
    // Проверка частоты сообщений для предотвращения зацикливания
    const now = Date.now();
    this.messageTimestamps.push(now);
    
    // Удаляем устаревшие метки (старше 1 секунды)
    while (this.messageTimestamps.length > 0 && this.messageTimestamps[0] < now - 1000) {
      this.messageTimestamps.shift();
    }
    
    // Проверяем превышение лимита сообщений
    if (this.messageTimestamps.length > this.MAX_MESSAGES_PER_SECOND) {
      console.error(`[SafeMessageReceiver] Too many messages (${this.messageTimestamps.length}) in the last second. Potential infinite loop detected.`);
      return true;
    }
    
    try {
      // Создаем уникальный ключ для сообщения
      const messageKey = `${event.origin}:${JSON.stringify(event.data)}:${this.messageCount++}`;
      
      // Проверяем, обрабатывали ли мы уже это сообщение
      if (processedMessages.has(messageKey)) {
        return true;
      }
      
      // Добавляем сообщение в список обработанных
      processedMessages.add(messageKey);
      
      // Ограничиваем размер кэша обработанных сообщений
      if (processedMessages.size > MAX_PROCESSED_MESSAGES) {
        // Удаляем самые старые сообщения
        const iterator = processedMessages.values();
        for (let i = 0; i < 50; i++) {
          processedMessages.delete(iterator.next().value);
        }
      }
      
      return false;
    } catch (error) {
      console.error('[SafeMessageReceiver] Error checking processed message:', error);
      return false;
    }
  }

  /**
   * Handle an incoming message event
   */
  private handleMessage(event: MessageEvent): void {
    try {
      // Skip if no data
      if (!event.data) {
        return;
      }
      
      // Log message in development mode
      if (isDevelopmentMode(this.window)) {
        console.log(`[SafeMessageReceiver] Received message from ${event.origin}:`, event.data);
      }
      
      // Проверяем, не обрабатывали ли мы уже это сообщение (защита от зацикливания)
      if (this.isMessageProcessed(event)) {
        console.warn(`[SafeMessageReceiver] Skipping already processed message from ${event.origin}`);
        return;
      }
      
      // Check if origin is allowed
      const isAllowed = BYPASS_ORIGIN_CHECK || isSafeMessageOrigin(this.window, event.origin);
      
      if (!isAllowed) {
        console.warn(`[SafeMessageReceiver] Message from non-allowed origin: ${event.origin}`);
        return;
      }
      
      // Process message with all handlers
      for (const handler of this.handlers) {
        try {
          handler(event);
        } catch (handlerError) {
          console.error(`[SafeMessageReceiver] Handler error:`, handlerError);
        }
      }
    } catch (error) {
      console.error(`[SafeMessageReceiver] Error processing message:`, error);
    }
  }
}

// Singleton instance for the current window
let globalReceiver: SafeMessageReceiver | null = null;

/**
 * Get the message receiver singleton for the current window
 */
export function getMessageReceiver(window: Window = globalThis.window): SafeMessageReceiver {
  if (!globalReceiver) {
    globalReceiver = new SafeMessageReceiver(window);
  }
  return globalReceiver;
}

/**
 * Для обратной совместимости с кодом, использующим старый API.
 * Создаёт обработчик сообщений, совместимый с типом (event: MessageEvent) => void
 */
export function setupMessageListener(
  handler: (event: MessageEvent) => void,
  window: Window = globalThis.window
): () => void {
  const receiver = getMessageReceiver(window);
  receiver.addHandler(handler);
  
  // Return a cleanup function
  return () => {
    receiver.removeHandler(handler);
  };
}

/**
 * Для обратной совместимости с кодом, использующим старый API.
 * Проверяет, является ли источник сообщения безопасным.
 */
export function handleSafePostMessage(event: MessageEvent, window: Window = globalThis.window): boolean {
  const isAllowed = BYPASS_ORIGIN_CHECK || isSafeMessageOrigin(window, event.origin);
  return isAllowed;
}
