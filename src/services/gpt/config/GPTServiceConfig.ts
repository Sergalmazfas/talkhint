
// Re-export all configuration types and functions
import { DEFAULT_CONFIG, PROXY_SERVERS, STORAGE_KEYS } from './GPTConfigTypes';
import type { GPTServiceConfig } from './GPTConfigTypes';
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
export type { GPTServiceConfig };
export {
  // Types and constants
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
