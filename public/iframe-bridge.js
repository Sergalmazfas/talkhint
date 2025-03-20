
(function() {
  // Enhanced allowed domains list
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
    'https://localhost'
  ];

  // For testing, accept any domain
  function isAllowedOrigin(origin) {
    if (!origin) return true; // Allow empty origin for testing
    if (origin.includes('localhost')) return true; // Always allow localhost
    if (origin.includes('lovable.')) return true; // Always allow lovable domains
    
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

  // Debug all messages regardless of origin
  window.addEventListener('message', function(event) {
    console.log(`[DEBUG] Raw message from ${event.origin}:`, event.data);
  }, true);

  // Process messages from allowed origins
  window.addEventListener('message', function(event) {
    // For testing, bypass origin check
    const bypassOriginCheck = true; // Set to false in production
    
    if (!isAllowedOrigin(event.origin) && !bypassOriginCheck) {
      console.warn(`Message from disallowed origin rejected: ${event.origin}`);
      return;
    }

    console.log(`Processing message from ${event.origin}:`, event.data);
    
    try {
      // Create response message
      const response = {
        type: 'IFRAME_RESPONSE',
        action: 'response',
        received: event.data,
        from: window.location.origin,
        timestamp: new Date().toISOString()
      };
      
      // Send response with multiple approaches
      if (event.source) {
        // Try wildcard (most reliable for testing)
        try {
          event.source.postMessage(response, '*');
          console.log('Sent response using wildcard origin');
        } catch (e) {
          console.error('Wildcard response failed:', e);
        }
        
        // Try specific origin
        try {
          event.source.postMessage(response, event.origin);
          console.log(`Sent response to specific origin: ${event.origin}`);
        } catch (e) {
          console.warn(`Failed to respond to specific origin:`, e);
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });
  
  // Notify parent window that iframe is ready
  function notifyReady() {
    try {
      const readyMessage = { 
        type: 'IFRAME_READY', 
        from: window.location.origin,
        timestamp: new Date().toISOString()
      };
      
      // Try with wildcard (most reliable)
      window.parent.postMessage(readyMessage, '*');
      console.log('Sent ready notification with wildcard origin');
      
      // Try specific parent if available
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
  
  // Send ready notification on load
  if (document.readyState === 'complete') {
    notifyReady();
  } else {
    window.addEventListener('load', notifyReady);
  }
  
  // Try also after a delay (for reliability)
  setTimeout(notifyReady, 500);
  
  console.log('iframe-bridge.js initialized');
})();
