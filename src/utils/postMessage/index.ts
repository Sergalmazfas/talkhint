
// Экспортируем все публичные функции и константы
export { 
  safePostMessage 
} from './sender';

export { 
  getMessageReceiver,
  SafeMessageReceiver,
  setupMessageListener,
  handleSafePostMessage
} from './receiver';

export { 
  testPostMessageAllOrigins,
  testIframePostMessage 
} from './testing';

export {
  isDevelopmentMode,
  BYPASS_ORIGIN_CHECK
} from './constants';

export {
  isSafeTargetOrigin,
  isSafeMessageOrigin,
  isOriginAllowed
} from './validators';
