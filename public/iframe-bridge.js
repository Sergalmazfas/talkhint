
(function() {
  // Extended allowed domains for communication
  const ALLOWED_ORIGINS = [
    // Lovable domains
    'https://lovable.dev',
    'https://www.lovable.dev',
    'http://lovable.dev',
    'http://www.lovable.dev',
    
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
    
    // Check www/non-www variants (e.g., lovable.dev and www.lovable.dev)
    const normalizedOrigin = origin.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/:\d+$/, '');
    console.log(`[iframe-bridge] Normalized origin: ${normalizedOrigin}`);
    
    // Check against all allowed domains with normalization
    const isAllowed = ALLOWED_ORIGINS.some(allowed => {
      const normalizedAllowed = allowed.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/:\d+$/, '');
      return normalizedAllowed === normalizedOrigin;
    });
    
    console.log(`[iframe-bridge] Origin ${origin} allowed: ${isAllowed}`);
    return isAllowed;
  }

  // Message handler - enhanced version with detailed logging
  window.addEventListener('message', function(event) {
    // Detailed origin logging
    console.log(`[iframe-bridge] Received message from ${event.origin || 'unknown origin'}`);
    
    // Check if the message source is allowed
    const isAllowed = isAllowedOrigin(event.origin);
    console.log(`[iframe-bridge] Message from ${event.origin}, allowed: ${isAllowed}`);
    
    if (!isAllowed) {
      console.warn(`[iframe-bridge] Message from disallowed origin rejected: ${event.origin}`);
      return;
    }

    const message = event.data;
    
    // Log received message
    console.log(`[iframe-bridge] Received message from ${event.origin}:`, message);
    
    // Process message
    try {
      // In development mode accept any messages
      const isDevelopment = 
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
        protocol: window.location.protocol
      };
      
      // Send response back to sender
      if (event.source) {
        console.log(`[iframe-bridge] Attempting to respond to ${event.origin}`);
        
        try {
          // First try sending to the specific origin
          event.source.postMessage(response, event.origin);
          console.log(`[iframe-bridge] Sent response to ${event.origin}`);
        } catch (e) {
          console.warn(`[iframe-bridge] Failed to respond to ${event.origin}:`, e);
          
          // If that fails, try with wildcard origin (for debugging)
          try {
            event.source.postMessage(response, '*');
            console.log('[iframe-bridge] Sent response using wildcard origin');
          } catch (e2) {
            console.error('[iframe-bridge] Failed to send even with wildcard:', e2);
          }
          
          // Try sending to all known domains
          for (const domain of ALLOWED_ORIGINS) {
            if (domain !== event.origin) {
              try {
                event.source.postMessage({
                  ...response,
                  _targetOrigin: domain,
                  _note: 'Multi-origin fallback'
                }, domain);
                console.log(`[iframe-bridge] Tried fallback response to ${domain}`);
              } catch (e3) {
                // Ignore errors in multi-domain sending
              }
            }
          }
        }
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
        readyState: document.readyState
      };
      
      console.log(`[iframe-bridge] Preparing to notify ready, parent: ${parentOrigin}`);
      
      // Multi-targeting strategy
      // 1. First try sending to specific domain if known
      if (parentOrigin !== '*') {
        try {
          window.parent.postMessage(readyMessage, parentOrigin);
          console.log(`[iframe-bridge] Notified ready to specific parent: ${parentOrigin}`);
        } catch (e) {
          console.warn(`[iframe-bridge] Failed to notify specific parent:`, e);
        }
      }
      
      // 2. Then send message with wildcard origin
      try {
        window.parent.postMessage({...readyMessage, _wildcard: true}, '*');
        console.log('[iframe-bridge] Sent wildcard ready notification');
      } catch (e) {
        console.error('[iframe-bridge] Wildcard notification failed:', e);
      }
      
      // 3. Additionally, try sending to all known domains
      for (const origin of ALLOWED_ORIGINS) {
        if (origin !== parentOrigin) {
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
      }
      
      // 4. For development mode, add information to the DOM
      if (window.location.hostname === 'localhost' || window.location.hostname.includes('localhost')) {
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
          <div>Allowed origins: ${ALLOWED_ORIGINS.join(', ')}</div>
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
    setTimeout(notifyReady, 500);
    setTimeout(notifyReady, 1000);
    setTimeout(notifyReady, 3000);
  }
  
  // Listen for DOMContentLoaded as another trigger
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(notifyReady, 100);
  });
  
  console.log('[iframe-bridge] Initialized successfully with origins:', ALLOWED_ORIGINS);
})();
