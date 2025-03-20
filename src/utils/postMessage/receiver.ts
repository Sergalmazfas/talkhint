
import { ALLOWED_ORIGINS } from '@/services/gpt/config/GPTServiceConfig';
import { isDevelopmentMode, BYPASS_ORIGIN_CHECK } from './constants';
import { isSafeMessageOrigin } from './validators';

// Флаг установки обработчика для предотвращения дублирования
let handlerInstalled = false;

/**
 * Типы сообщений для приема
 */
export type MessageDataType = {
  type: string;
  payload?: any;
  _source?: string;
  _timestamp?: string;
  _id?: number;
};

/**
 * Обработчик сообщений
 */
export type MessageHandler = (data: MessageDataType) => void;

/**
 * Опции для настройки приема сообщений
 */
export type MessageReceiverOptions = {
  debugLog?: boolean;
  bypassOriginCheck?: boolean;
};

/**
 * Класс для безопасного приема сообщений с проверкой разрешенных доменов
 */
export class SafeMessageReceiver {
  private readonly window: Window;
  private readonly handlers: Map<string, Set<MessageHandler>> = new Map();
  private readonly defaultHandler: Set<MessageHandler> = new Set();
  private debugLog: boolean;
  private bypassOriginCheck: boolean;
  private boundMessageHandler: (event: MessageEvent) => void;

  /**
   * Создает новый экземпляр для приема сообщений
   * @param window Объект окна
   * @param options Опции конфигурации
   */
  constructor(window: Window, options: MessageReceiverOptions = {}) {
    this.window = window;
    this.debugLog = options.debugLog || false;
    this.bypassOriginCheck = options.bypassOriginCheck || BYPASS_ORIGIN_CHECK;
    this.boundMessageHandler = this.handleMessage.bind(this);
    
    // Устанавливаем обработчик только один раз
    if (!handlerInstalled) {
      this.window.addEventListener('message', this.boundMessageHandler);
      handlerInstalled = true;
      if (this.debugLog) {
        console.log('[SafeMessageReceiver] Message handler installed');
      }
    }
  }

  /**
   * Регистрирует обработчик для определенного типа сообщений
   * @param type Тип сообщения
   * @param handler Функция обработчик
   */
  public on(type: string, handler: MessageHandler): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)?.add(handler);
    
    if (this.debugLog) {
      console.log(`[SafeMessageReceiver] Handler registered for type: ${type}`);
    }
  }

  /**
   * Регистрирует обработчик для всех типов сообщений
   * @param handler Функция обработчик
   */
  public onAny(handler: MessageHandler): void {
    this.defaultHandler.add(handler);
    
    if (this.debugLog) {
      console.log('[SafeMessageReceiver] Default handler registered');
    }
  }

  /**
   * Удаляет обработчик для определенного типа сообщений
   * @param type Тип сообщения
   * @param handler Функция обработчик
   */
  public off(type: string, handler: MessageHandler): void {
    if (this.handlers.has(type)) {
      this.handlers.get(type)?.delete(handler);
      if (this.debugLog) {
        console.log(`[SafeMessageReceiver] Handler removed for type: ${type}`);
      }
    }
  }

  /**
   * Удаляет обработчик для всех типов сообщений
   * @param handler Функция обработчик
   */
  public offAny(handler: MessageHandler): void {
    this.defaultHandler.delete(handler);
    if (this.debugLog) {
      console.log('[SafeMessageReceiver] Default handler removed');
    }
  }

  /**
   * Очищает все обработчики
   */
  public clearHandlers(): void {
    this.handlers.clear();
    this.defaultHandler.clear();
    if (this.debugLog) {
      console.log('[SafeMessageReceiver] All handlers cleared');
    }
  }

  /**
   * Обрабатывает входящие сообщения
   * @param event Событие сообщения
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const isDevelopment = isDevelopmentMode(this.window);
      
      // Проверяем origin сообщения, кроме режима разработки
      if (!this.bypassOriginCheck && !isDevelopment) {
        const isOriginSafe = isSafeMessageOrigin(this.window, event.origin);
        
        if (!isOriginSafe) {
          if (this.debugLog) {
            console.warn(`[SafeMessageReceiver] Message from untrusted origin rejected: ${event.origin}`);
          }
          return;
        }
      }
      
      // Валидация данных сообщения
      if (!event.data || typeof event.data !== 'object') {
        if (this.debugLog) {
          console.warn('[SafeMessageReceiver] Invalid message format rejected', event.data);
        }
        return;
      }
      
      const { type, ...data } = event.data;
      
      if (!type || typeof type !== 'string') {
        if (this.debugLog) {
          console.warn('[SafeMessageReceiver] Message without type rejected', event.data);
        }
        return;
      }
      
      if (this.debugLog) {
        console.log(`[SafeMessageReceiver] Message received of type: ${type}`, data);
      }
      
      // Вызываем обработчики для данного типа
      if (this.handlers.has(type)) {
        const typeHandlers = this.handlers.get(type);
        typeHandlers?.forEach(handler => {
          try {
            handler(event.data);
          } catch (error) {
            console.error(`[SafeMessageReceiver] Error in handler for type ${type}:`, error);
          }
        });
      }
      
      // Вызываем общие обработчики
      this.defaultHandler.forEach(handler => {
        try {
          handler(event.data);
        } catch (error) {
          console.error('[SafeMessageReceiver] Error in default handler:', error);
        }
      });
    } catch (error) {
      console.error('[SafeMessageReceiver] Error processing message:', error);
    }
  }

  /**
   * Освобождает ресурсы и удаляет обработчик сообщений
   */
  public destroy(): void {
    this.window.removeEventListener('message', this.boundMessageHandler);
    handlerInstalled = false;
    this.clearHandlers();
    if (this.debugLog) {
      console.log('[SafeMessageReceiver] Destroyed');
    }
  }
}

// Экспортируем singleton для удобства использования
let globalReceiver: SafeMessageReceiver | null = null;

/**
 * Создает или возвращает глобальный экземпляр приемника сообщений
 */
export function getMessageReceiver(window: Window, options: MessageReceiverOptions = {}): SafeMessageReceiver {
  if (!globalReceiver) {
    globalReceiver = new SafeMessageReceiver(window, {
      ...options,
      bypassOriginCheck: options.bypassOriginCheck || BYPASS_ORIGIN_CHECK
    });
  }
  return globalReceiver;
}
