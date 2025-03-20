
import { ALLOWED_ORIGINS } from '@/services/gpt/config/GPTServiceConfig';
import { isDevelopmentMode, BYPASS_ORIGIN_CHECK, safeStringify } from './constants';
import { isSafeTargetOrigin } from './validators';

// Counter to prevent infinite loops
let messageCounter = 0;
const MAX_MESSAGES_PER_SECOND = 30;
const messageTimestamps: number[] = [];

// Cache for tracking recently sent messages
const recentlySentMessages = new Set<string>();
const MAX_RECENT_MESSAGES = 100;

/**
 * Safe message sending with allowed domain checks
 * @param window Window object
 * @param targetWindow Target window (e.g., iframe.contentWindow)
 * @param message Message to send
 * @param targetOrigin Target domain
 * @returns true if message was sent, false if target domain not allowed
 */
export function safePostMessage(
  window: Window,
  targetWindow: Window | null,
  message: any,
  targetOrigin: string
): boolean {
  if (!targetWindow) {
    console.error('[safePostMessage] Target window is null or undefined');
    return false;
  }

  // Check if we're sending a message to ourselves
  if (targetWindow === window) {
    console.warn('[safePostMessage] Trying to send message to self, aborting');
    return false;
  }

  // Prevent sending the same message multiple times in a row
  const messageKey = `${targetOrigin}:${safeStringify(message)}`;
  if (recentlySentMessages.has(messageKey)) {
    console.warn('[safePostMessage] Duplicate message detected, skipping to prevent loops');
    return false;
  }
  
  // Add message to sent cache
  recentlySentMessages.add(messageKey);
  
  // Limit cache size
  if (recentlySentMessages.size > MAX_RECENT_MESSAGES) {
    const iterator = recentlySentMessages.values();
    recentlySentMessages.delete(iterator.next().value);
  }

  // Message rate limiting to prevent loops
  const now = Date.now();
  messageTimestamps.push(now);
  
  // Remove old timestamps (older than 1 second)
  while (messageTimestamps.length > 0 && messageTimestamps[0] < now - 1000) {
    messageTimestamps.shift();
  }
  
  // Check message rate
  if (messageTimestamps.length > MAX_MESSAGES_PER_SECOND) {
    console.error(`[safePostMessage] Too many messages (${messageTimestamps.length}) in the last second. Potential infinite loop detected.`);
    return false;
  }
  
  // Determine mode - development or production
  const isDevelopment = isDevelopmentMode(window);
  
  // If targetWindow is the same window or an iframe without a content window
  if (targetWindow === window || !targetWindow.postMessage) {
    console.warn('[safePostMessage] Target window is the same as source or invalid');
    return false;
  }

  // Detailed logging for debugging
  console.log(`[safePostMessage] Attempting to send message to ${targetOrigin || 'unknown'}`);
  console.log(`[safePostMessage] Current origin: ${window.location.origin}`);

  // Enrich message with debug info
  const enrichedMessage = {
    ...message,
    _source: window.location.origin,
    _timestamp: new Date().toISOString(),
    _id: messageCounter++
  };

  try {
    // For local development - use '*' for easier testing
    if (isDevelopment) {
      console.log('[DEV] Sending message with wildcard origin for development');
      targetWindow.postMessage(enrichedMessage, '*');
      return true;
    }
    
    // Check if domain is allowed in normal mode
    const allowed = BYPASS_ORIGIN_CHECK || isSafeTargetOrigin(window, targetOrigin);
    console.log(`[safePostMessage] Target origin ${targetOrigin} allowed: ${allowed}`);
    
    if (!allowed) {
      console.error(`Target origin ${targetOrigin} is not in the allowed list`, ALLOWED_ORIGINS);
      
      // In bypass mode or development send message for debugging
      if (BYPASS_ORIGIN_CHECK || isDevelopment) {
        console.warn('[BYPASS/DEV] Sending despite origin check failure');
        targetWindow.postMessage(enrichedMessage, '*');
        return true;
      }
      
      return false;
    }
    
    // In production send message only to verified origin
    console.log(`Sending message to ${targetOrigin}:`, enrichedMessage);
    targetWindow.postMessage(enrichedMessage, targetOrigin);
    
    return true;
  } catch (error) {
    console.error('[safePostMessage] Error posting message:', error);
    
    // Try to send via wildcard in development mode
    if (isDevelopment || BYPASS_ORIGIN_CHECK) {
      try {
        console.warn('[safePostMessage] Attempting fallback with wildcard origin');
        targetWindow.postMessage(enrichedMessage, '*');
        return true;
      } catch (fallbackError) {
        console.error('[safePostMessage] Even fallback sending failed:', fallbackError);
      }
    }
    
    return false;
  }
}
