
// Re-export all configuration types and functions
import { GPTServiceConfig, DEFAULT_CONFIG, PROXY_SERVERS, STORAGE_KEYS } from './GPTConfigTypes';
import { isValidApiKey, isValidUrl, ensureUrlProtocol } from './GPTConfigValidation';
import {
  loadApiKeyFromStorage,
  saveApiKeyToStorage,
  loadResponseStyleFromStorage,
  saveResponseStyleToStorage,
  loadUseServerProxyFromStorage,
  saveUseServerProxyToStorage,
  loadServerProxyUrlFromStorage,
  saveServerProxyUrlToStorage,
  loadDebugModeFromStorage,
  saveDebugModeToStorage
} from './GPTConfigStorage';

// Export everything for backward compatibility
export {
  // Types and constants
  GPTServiceConfig,
  DEFAULT_CONFIG,
  PROXY_SERVERS,
  STORAGE_KEYS,
  
  // Validation functions
  isValidApiKey,
  isValidUrl,
  ensureUrlProtocol,
  
  // Storage functions
  loadApiKeyFromStorage,
  saveApiKeyToStorage,
  loadResponseStyleFromStorage,
  saveResponseStyleToStorage,
  loadUseServerProxyFromStorage,
  saveUseServerProxyToStorage,
  loadServerProxyUrlFromStorage,
  saveServerProxyUrlToStorage,
  loadDebugModeFromStorage,
  saveDebugModeToStorage
};
