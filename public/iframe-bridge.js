
(function() {
  // Extended allowed domains for communication
  const ALLOWED_ORIGINS = [
    // Lovable domains
    'https://lovable.dev',
    'https://www.lovable.dev',
    'http://lovable.dev',
    'http://www.lovable.dev',
    'https://id-preview--be5c3e65-2457-46cb-a8e0-02444f6fdcc1.lovable.app',
    'https://id-preview--be5c3e65-2457-46cb-a8e0-02444f6fdcc1.lovable.app:3000',
    
    // GPT Engineer domains
    'https://gptengineer.app',
    'https://www.gptengineer.app',
    'http://gptengineer.app',
    'http://www.gptengineer.app',
    'https://gptengineer.io',
    'https://www.gptengineer.io',
    'http://gptengineer.io',
    'http://www.gptengineer.io',
    
    // Localhost with various ports
    'http://localhost:3000',
    'https://localhost:3000',
    'http://localhost:8080',
    'https://localhost:8080',
    'http://localhost:5173',
    'https://localhost:5173',
    'http://localhost',
    'https://localhost'
  ];

  // Enhanced allowed domain check with detailed logging
  function isAllowedOrigin(origin) {
    console.log(`[iframe-bridge] Checking if origin is allowed: ${origin}`);
    
    // If origin is empty or missing, allow for debugging
    if (!origin) {
      console.log('[iframe-bridge] Empty origin, allowing for debugging');
      return true;
    }
    
    // In development mode, allow localhost
    if (origin.includes('localhost')) {
      console.log('[iframe-bridge] Localhost origin detected, allowing');
      return true;
    }
    
    // Special case for lovable.app subdomains
    if (origin.includes('lovable.app')) {
      console.log(`[iframe-bridge] Allowing lovable.app subdomain: ${origin}`);
      return true;
    }
    
    // Check www/non-www variants (e.g., lovable.dev and www.lovable.dev)
    function normalizeOrigin(url) {
      try {
        return url.replace(/^https?:\/\//, '')  // Remove protocol
                 .replace(/^www\./, '')         // Remove www.
                 .replace(/:\d+$/, '')          // Remove port
                 .toLowerCase();                // Normalize case
      } catch (e) {
        console.error("[iframe-bridge] Error normalizing origin:", e);
        return url.toLowerCase();
      }
    }
    
    const normalizedOrigin = normalizeOrigin(origin);
    console.log(`[iframe-bridge] Normalized origin: ${normalizedOrigin}`);
    
    // Check against all allowed domains with normalization
    const isAllowed = ALLOWED_ORIGINS.some(allowed => {
      const normalizedAllowed = normalizeOrigin(allowed);
      return normalizedAllowed === normalizedOrigin;
    });
    
    console.log(`[iframe-bridge] Origin ${origin} allowed: ${isAllowed}`);
    return isAllowed;
  }

  // Simple logging handler for ANY message - helps with debugging
  window.addEventListener('message', function(event) {
    // Log all messages without filtering to help with debugging
    console.log(`[iframe-bridge] [DEBUG] Raw message received from ${event.origin || 'unknown'}:`, event.data);
  }, true);  // Use capture phase to ensure this runs before any filtering

  // Message handler - enhanced version with detailed logging
  window.addEventListener('message', function(event) {
    // Detailed origin logging
    console.log(`[iframe-bridge] Received message from ${event.origin || 'unknown origin'}`);
    
    // Check if the message source is allowed
    const isAllowed = isAllowedOrigin(event.origin);
    console.log(`[iframe-bridge] Message from ${event.origin}, allowed: ${isAllowed}`);
    
    // FOR TESTING: Always process messages regardless of origin
    // This helps debug cross-origin issues during development
    const bypassOriginCheck = true; // Set to false in production
    
    if (!isAllowed && !bypassOriginCheck) {
      console.warn(`[iframe-bridge] Message from disallowed origin rejected: ${event.origin}`);
      // For debugging, still log the data
      console.log(`[iframe-bridge] [DEBUG] Rejected message content:`, event.data);
      return;
    }

    const message = event.data;
    
    // Log received message
    console.log(`[iframe-bridge] Processing message from ${event.origin}:`, message);
    
    // Process message
    try {
      // Always accept messages in development mode
      const isDevelopment = true || // Force development mode for testing
        window.location.hostname === 'localhost' || 
        document.referrer.includes('localhost');
      
      // Create response message with extended metadata
      const response = {
        type: 'IFRAME_RESPONSE',
        action: 'response',
        from: 'iframe-bridge',
        received: message,
        timestamp: new Date().toISOString(),
        environment: isDevelopment ? 'development' : 'production',
        url: window.location.href,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        protocol: window.location.protocol,
        originMatched: isAllowed,
        bypassActive: bypassOriginCheck
      };
      
      // Send response back to sender and all possible origins
      if (event.source) {
        console.log(`[iframe-bridge] Attempting to respond to ${event.origin}`);
        
        // Try multiple approaches to guarantee message delivery
        const sendToKnownOrigins = () => {
          // Try with specific origin first
          try {
            event.source.postMessage(response, event.origin);
            console.log(`[iframe-bridge] Sent response to specific origin: ${event.origin}`);
          } catch (e) {
            console.warn(`[iframe-bridge] Failed to respond to specific origin ${event.origin}:`, e);
          }
          
          // Try with wildcard origin (for debugging)
          try {
            event.source.postMessage(response, '*');
            console.log('[iframe-bridge] Sent response using wildcard origin');
          } catch (e) {
            console.error('[iframe-bridge] Failed to send with wildcard:', e);
          }
          
          // Try sending to all known domains for maximum compatibility
          ALLOWED_ORIGINS.forEach(domain => {
            if (domain !== event.origin && domain !== '*') {
              try {
                event.source.postMessage({
                  ...response,
                  _targetOrigin: domain,
                  _note: 'Multi-origin fallback'
                }, domain);
                console.log(`[iframe-bridge] Tried fallback response to ${domain}`);
              } catch (e) {
                // Ignore errors in multi-domain sending
              }
            }
          });
        };
        
        // Execute sending now and after a small delay to handle timing issues
        sendToKnownOrigins();
        setTimeout(sendToKnownOrigins, 100);
        setTimeout(sendToKnownOrigins, 500);
      }
    } catch (error) {
      console.error('[iframe-bridge] Error processing message:', error);
    }
  });
  
  // Ready notification function - enhanced version
  function notifyReady() {
    try {
      // Safely get parent window origin
      let parentOrigin = '*'; // Fallback for debugging
      
      try {
        if (document.referrer) {
          parentOrigin = new URL(document.referrer).origin;
          console.log(`[iframe-bridge] Detected parent origin from referrer: ${parentOrigin}`);
        }
      } catch (e) {
        console.warn('[iframe-bridge] Could not parse referrer:', e);
      }
      
      // Create ready message with extended metadata
      const readyMessage = { 
        type: 'IFRAME_READY', 
        from: window.location.origin,
        url: window.location.href,
        referrer: document.referrer,
        timestamp: new Date().toISOString(),
        protocol: window.location.protocol,
        userAgent: navigator.userAgent,
        readyState: document.readyState,
        allowedOrigins: ALLOWED_ORIGINS
      };
      
      console.log(`[iframe-bridge] Preparing to notify ready, parent: ${parentOrigin}`);
      
      // Multi-targeting strategy for maximum compatibility
      const broadcastReady = () => {
        // 1. First try sending to specific domain if known
        if (parentOrigin !== '*') {
          try {
            window.parent.postMessage(readyMessage, parentOrigin);
            console.log(`[iframe-bridge] Notified ready to specific parent: ${parentOrigin}`);
          } catch (e) {
            console.warn(`[iframe-bridge] Failed to notify specific parent:`, e);
          }
        }
        
        // 2. Always send message with wildcard origin
        try {
          window.parent.postMessage({...readyMessage, _wildcard: true}, '*');
          console.log('[iframe-bridge] Sent wildcard ready notification');
        } catch (e) {
          console.error('[iframe-bridge] Wildcard notification failed:', e);
        }
        
        // 3. Additionally, try sending to all known domains
        ALLOWED_ORIGINS.forEach(origin => {
          if (origin !== parentOrigin && origin !== '*') {
            try {
              window.parent.postMessage({
                ...readyMessage, 
                _targetOrigin: origin,
                _broadcast: true
              }, origin);
              console.log(`[iframe-bridge] Sent broadcast notification to ${origin}`);
            } catch (e) {
              // Ignore errors in multi-domain sending
            }
          }
        });
      };
      
      // Execute broadcast now and after delays to ensure delivery
      broadcastReady();
      setTimeout(broadcastReady, 100);
      setTimeout(broadcastReady, 500);
      
      // 4. For development or debugging, add information to the DOM
      const isDebug = true; // Always enable debug info
      if (isDebug || window.location.hostname === 'localhost' || window.location.hostname.includes('localhost')) {
        const debugInfo = document.createElement('div');
        debugInfo.style.position = 'fixed';
        debugInfo.style.bottom = '10px';
        debugInfo.style.right = '10px';
        debugInfo.style.background = 'rgba(0,0,0,0.7)';
        debugInfo.style.color = 'white';
        debugInfo.style.padding = '5px';
        debugInfo.style.borderRadius = '3px';
        debugInfo.style.fontSize = '10px';
        debugInfo.style.zIndex = '9999';
        debugInfo.innerHTML = `
          <div>Origin: ${window.location.origin}</div>
          <div>Parent: ${parentOrigin || 'unknown'}</div>
          <div>Protocol: ${window.location.protocol}</div>
          <div>Ready notifications sent</div>
          <div>Referrer: ${document.referrer || 'none'}</div>
        `;
        document.body.appendChild(debugInfo);
      }
    } catch (error) {
      console.error('[iframe-bridge] Error in notifyReady:', error);
    }
  }
  
  // Notify parent window that iframe is loaded and ready
  // Using a more reliable approach with multiple attempts
  if (document.readyState === 'complete') {
    notifyReady();
  } else {
    window.addEventListener('load', notifyReady);
    
    // Additionally try sending notification at specific intervals
    // to work around loading issues in different browsers
    setTimeout(notifyReady, 100);
    setTimeout(notifyReady, 500);
    setTimeout(notifyReady, 1000);
    setTimeout(notifyReady, 3000);
  }
  
  // Listen for DOMContentLoaded as another trigger
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(notifyReady, 100);
  });
  
  // Add a fallback "ready" trigger after a few seconds regardless of page state
  setTimeout(notifyReady, 2000);
  
  // Create a basic listener injection for localhost testing
  if (window.location.hostname === 'localhost') {
    console.log('[iframe-bridge] Adding special localhost message handler');
    // This code simulates what should be added to the localhost:3000 server
    window.addEventListener("message", (event) => {
      console.log("[localhost-handler] Received message from:", event.origin);
      console.log("[localhost-handler] Message data:", event.data);
      
      // Echo back the message to help with debugging
      if (event.source) {
        try {
          event.source.postMessage({
            type: 'LOCALHOST_ECHO',
            originalMessage: event.data,
            originalOrigin: event.origin,
            timestamp: new Date().toISOString()
          }, '*');
          console.log("[localhost-handler] Sent echo response with wildcard");
        } catch (e) {
          console.error("[localhost-handler] Failed to send echo:", e);
        }
        
        try {
          event.source.postMessage({
            type: 'LOCALHOST_ECHO',
            originalMessage: event.data,
            originalOrigin: event.origin,
            timestamp: new Date().toISOString()
          }, event.origin);
          console.log(`[localhost-handler] Sent echo response to ${event.origin}`);
        } catch (e) {
          console.error(`[localhost-handler] Failed to send echo to ${event.origin}:`, e);
        }
      }
    });
  }
  
  console.log('[iframe-bridge] Initialized successfully with origins:', ALLOWED_ORIGINS);
})();
