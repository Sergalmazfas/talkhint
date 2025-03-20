
/**
 * Constants for postMessage system
 */

// Determine development mode based on URL
export const isDevelopmentMode = (window: Window): boolean => {
  const hostname = window.location.hostname;
  const isDev = hostname === 'localhost' || 
                hostname === '127.0.0.1' || 
                hostname.includes('local') ||
                hostname.includes('dev') ||
                hostname.includes('preview') ||
                hostname.includes('staging');
  
  // Log for debugging
  console.log(`[isDevelopmentMode] Current hostname: ${hostname}, isDev: ${isDev}`);
  return isDev;
};

// Flag to bypass origin check for debugging
// In production this flag must be false
export const BYPASS_ORIGIN_CHECK = process.env.NODE_ENV === 'development';

// Add method to protect against circular references in JSON.stringify
export function safeStringify(obj: any): string {
  try {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      return value;
    });
  } catch (error) {
    console.error('Error in safeStringify:', error);
    return `[Unstringifiable Object: ${typeof obj}]`;
  }
}
