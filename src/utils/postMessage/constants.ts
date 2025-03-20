
import { ALLOWED_ORIGINS } from '@/services/gpt/config/GPTServiceConfig';

/**
 * Определяет, работает ли приложение в режиме разработки
 * @param window Объект окна
 * @returns boolean
 */
export function isDevelopmentMode(window: Window): boolean {
  return process.env.NODE_ENV === 'development' || 
         window.location.hostname === 'localhost';
}

/**
 * Временный флаг для обхода проверки доменов (для тестирования)
 * Установите в false для продакшена
 */
export const BYPASS_ORIGIN_CHECK = true;

