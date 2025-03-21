
/**
 * Check if an API key is valid format
 */
export function isValidApiKey(key: string | null): boolean {
  if (!key) return false;
  
  // OpenAI API keys should start with 'sk-' and be at least 32 chars
  const trimmedKey = key.trim();
  return trimmedKey.startsWith('sk-') && trimmedKey.length >= 32;
}

/**
 * Check if a URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensure a URL has a proper protocol (https:// or http://)
 */
export function ensureUrlProtocol(url: string): string {
  if (!url) return url;
  
  // If URL already has protocol, return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Default to https protocol
  return `https://${url}`;
}
