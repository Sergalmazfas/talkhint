
// Экспортируем все публичные функции и константы
export { 
  safePostMessage 
} from './sender';

export { 
  handleSafePostMessage,
  setupMessageListener 
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
  isOriginAllowed,
  isSafeTargetOrigin
} from './validators';

