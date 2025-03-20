
(function() {
  // Extended list of allowed domains
  const ALLOWED_ORIGINS = [
    'https://lovable.dev',
    'https://www.lovable.dev',
    'http://lovable.dev',
    'http://www.lovable.dev',
    'https://id-preview--be5c3e65-2457-46cb-a8e0-02444f6fdcc1.lovable.app',
    'https://id-preview--be5c3e65-2457-46cb-a8e0-02444f6fdcc1.lovable.app:3000',
    'https://gptengineer.app',
    'https://www.gptengineer.app',
    'http://gptengineer.app',
    'http://www.gptengineer.app',
    'https://gptengineer.io',
    'https://www.gptengineer.io',
    'http://gptengineer.io',
    'http://www.gptengineer.io',
    'http://localhost:3000',
    'https://localhost:3000',
    'http://localhost:8080',
    'https://localhost:8080',
    'http://localhost:5173',
    'https://localhost:5173',
    'http://localhost',
    'https://localhost',
    'https://lovable-server.vercel.app',
    'http://lovable-server.vercel.app',
    'https://www.googletagmanager.com',
    'https://googletagmanager.com'
  ];

  // Always accept messages in debug mode
  const DEBUG_MODE = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1' || 
                    window.location.hostname.includes('dev') ||
                    window.location.hostname.includes('preview') ||
                    window.location.hostname.includes('staging');
  
  // Counter for sent messages to prevent loops
  let messageCounter = 0;
  const MAX_MESSAGES = 100;

  // Check allowed domain
  function isAllowedOrigin(origin) {
    if (DEBUG_MODE) return true; // In debug mode, allow all domains
    if (!origin) return false; // Empty origin not allowed in production
    if (origin.includes('localhost')) return true; // Always allow localhost
    if (origin.includes('lovable.')) return true; // Always allow lovable domains
    if (origin.includes('gptengineer.')) return true; // Always allow gptengineer domains
    
    // Normalize domains for comparison
    const normalizeOrigin = (url) => {
      try {
        return url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/:\d+$/, '').toLowerCase();
      } catch (e) {
        console.error("Error normalizing origin:", e);
        return url.toLowerCase();
      }
    };
    
    const normalizedOrigin = normalizeOrigin(origin);
    return ALLOWED_ORIGINS.some(allowed => normalizeOrigin(allowed) === normalizedOrigin);
  }

  // Store already received messages to prevent duplicate processing
  const processedMessages = new Set();
  const messageTimestamps = [];
  const MAX_MESSAGES_PER_SECOND = 20;
  
  // Prevent loops by checking if message has been processed
  function isMessageProcessed(event) {
    // Check message rate limit
    const now = Date.now();
    messageTimestamps.push(now);
    
    // Remove timestamps older than 1 second
    while (messageTimestamps.length > 0 && messageTimestamps[0] < now - 1000) {
      messageTimestamps.shift();
    }
    
    // Check for excessive message rate
    if (messageTimestamps.length > MAX_MESSAGES_PER_SECOND) {
      console.error(`Too many messages (${messageTimestamps.length}/second). Blocking potential infinite loop.`);
      return true;
    }
    
    // Create a unique hash-key for the message based on content and source
    try {
      // Safe stringify with circular reference protection
      const safeStringify = (obj) => {
        try {
          const seen = new WeakSet();
          return JSON.stringify(obj, (key, value) => {
            if (typeof value === 'object' && value !== null) {
              if (seen.has(value)) return '[Circular]';
              seen.add(value);
            }
            return value;
          });
        } catch (e) {
          return `[Unstringifiable: ${typeof obj}]`;
        }
      };
      
      const messageData = safeStringify(event.data);
      const messageKey = `${event.origin}:${messageData}`;
      
      // Check if we've already processed this message
      if (processedMessages.has(messageKey)) {
        return true;
      }
      
      // Add message to processed list
      processedMessages.add(messageKey);
      
      // Limit the size of the processed messages cache
      if (processedMessages.size > 200) {
        // Remove oldest messages
        const iterator = processedMessages.values();
        for (let i = 0; i < 50; i++) {
          processedMessages.delete(iterator.next().value);
        }
      }
      
      return false;
    } catch (e) {
      console.error("Error checking message processed status:", e);
      return false;
    }
  }

  // Debug all messages regardless of origin
  window.addEventListener('message', function(event) {
    console.log(`[DEBUG] Raw message from ${event.origin}:`, event.data);
  }, true);

  // Improved message handler for allowed domains
  window.addEventListener('message', function(event) {
    try {
      // Loop protection: if counter exceeds MAX_MESSAGES, stop processing
      if (messageCounter > MAX_MESSAGES) {
        console.error(`[SAFETY] Too many messages processed (${messageCounter}). Stopping to prevent infinite loop.`);
        return;
      }
      
      // Check if we've already processed this message
      if (isMessageProcessed(event)) {
        return;
      }
      
      // Check if origin is allowed
      if (!isAllowedOrigin(event.origin) && !DEBUG_MODE) {
        console.warn(`Message from non-allowed origin rejected: ${event.origin}`);
        return;
      }
      
      messageCounter++;
      console.log(`Processing message #${messageCounter} from ${event.origin}:`, event.data);
      
      // Check for React error #301
      if (event.data && event.data.type === 'REACT_ERROR') {
        console.error('React Error detected:', event.data.error);
        // Here you can add additional React error handling
      }
      
      // Create response message
      const response = {
        type: 'IFRAME_RESPONSE',
        action: 'response',
        received: event.data,
        from: window.location.origin,
        timestamp: new Date().toISOString(),
        messageCount: messageCounter
      };
      
      // Send response in different ways
      if (event.source) {
        // Try wildcard (most reliable for testing)
        try {
          event.source.postMessage(response, '*');
          console.log('Sent response using wildcard origin');
        } catch (e) {
          console.error('Wildcard response failed:', e);
        }
        
        // Try specific origin
        if (event.origin) {
          try {
            event.source.postMessage(response, event.origin);
            console.log(`Sent response to specific origin: ${event.origin}`);
          } catch (e) {
            console.warn(`Failed to respond to specific origin:`, e);
          }
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });
  
  // Notify parent window that iframe is ready
  function notifyReady() {
    // Check if parent window is accessible and we can send messages
    if (!window.parent || !window.parent.postMessage) {
      console.warn('Parent window is not accessible for postMessage');
      return;
    }
    
    try {
      const readyMessage = { 
        type: 'IFRAME_READY', 
        from: window.location.origin,
        url: window.location.href,
        timestamp: new Date().toISOString()
      };
      
      // Send with all available methods
      
      // Via wildcard (most reliable)
      window.parent.postMessage(readyMessage, '*');
      console.log('Sent ready notification with wildcard origin');
      
      // Via specific parent if available
      if (document.referrer) {
        try {
          const parentOrigin = new URL(document.referrer).origin;
          window.parent.postMessage(readyMessage, parentOrigin);
          console.log(`Sent ready notification to specific parent: ${parentOrigin}`);
        } catch (e) {
          console.warn('Failed to notify specific parent:', e);
        }
      }
    } catch (error) {
      console.error('Error in notifyReady:', error);
    }
  }
  
  // Send ready notification
  if (document.readyState === 'complete') {
    notifyReady();
  } else {
    window.addEventListener('load', notifyReady);
  }
  
  // Function to catch React errors
  function listenForReactErrors() {
    const originalError = console.error;
    console.error = function(...args) {
      originalError.apply(console, args);
      
      const errorStr = args.join(' ');
      if (errorStr.includes('React error') || 
          errorStr.includes('minified React') || 
          errorStr.includes('Error #301')) {
        try {
          // Send error message to parent window
          window.parent.postMessage({
            type: 'REACT_ERROR',
            error: errorStr,
            timestamp: new Date().toISOString(),
            location: window.location.href
          }, '*');
          console.log('Reported React error to parent window');
        } catch (e) {
          console.warn('Failed to report React error:', e);
        }
      }
    };
  }
  
  // Activate React error catching
  listenForReactErrors();
  
  console.log('iframe-bridge.js initialized with DEBUG_MODE:', DEBUG_MODE);
})();
