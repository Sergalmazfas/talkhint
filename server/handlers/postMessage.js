
// Handler for the postMessage test page
function postMessageTestHandler(req, res) {
  // Send HTML page with JavaScript for testing postMessage
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
      <title>PostMessage Test</title>
      <script>
          // Set up handler to receive messages
          window.addEventListener('message', (event) => {
              // In development mode, accept any messages
              const isDevelopment = true; // Always accept for testing
              
              console.log('Received message from ' + event.origin + ':', event.data);
              document.getElementById('messages').innerHTML += 
                  '<div><strong>From:</strong> ' + event.origin + 
                  '<br><pre>' + JSON.stringify(event.data, null, 2) + '</pre></div>';
              
              // Respond to message
              if (event.source) {
                  try {
                      // First try with wildcard (most reliable for testing)
                      event.source.postMessage({
                          type: 'RESPONSE',
                          receivedData: event.data,
                          from: window.location.origin,
                          timestamp: new Date().toISOString(),
                          note: 'Using wildcard origin'
                      }, '*');
                      console.log('Responded using wildcard origin');
                      
                      // Also try with specific origin
                      event.source.postMessage({
                          type: 'RESPONSE',
                          receivedData: event.data,
                          from: window.location.origin,
                          timestamp: new Date().toISOString()
                      }, event.origin);
                      console.log('Responded to:', event.origin);
                  } catch (e) {
                      console.error('Response attempt failed:', e);
                  }
              }
          });
          
          // Send message to parent window on load
          window.addEventListener('load', () => {
              try {
                  // Debug info
                  document.getElementById('debug').innerHTML = 
                      '<div>URL: ' + window.location.href + '</div>' +
                      '<div>Origin: ' + window.location.origin + '</div>' +
                      '<div>Protocol: ' + window.location.protocol + '</div>' +
                      '<div>Referrer: ' + document.referrer + '</div>';
                  
                  // Ready message
                  const readyMessage = {
                      type: 'IFRAME_LOADED',
                      from: window.location.origin,
                      timestamp: new Date().toISOString(),
                      url: window.location.href,
                      referrer: document.referrer
                  };
                  
                  // Try wildcard first (most reliable)
                  window.parent.postMessage(readyMessage, '*');
                  console.log('Sent IFRAME_LOADED message using wildcard origin');
                  
                  // Also try specific parent if available
                  if (document.referrer) {
                      try {
                          const parentOrigin = new URL(document.referrer).origin;
                          window.parent.postMessage(readyMessage, parentOrigin);
                          console.log('Sent IFRAME_LOADED message to referrer:', parentOrigin);
                      } catch (e) {
                          console.warn('Failed to send to referrer:', e);
                      }
                  }
              } catch (e) {
                  console.error('Error in load handler:', e);
                  document.getElementById('errors').innerHTML += 
                      '<div>' + e.toString() + '</div>';
              }
          });
      </script>
      <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          pre { background: #f0f0f0; padding: 10px; border-radius: 5px; overflow: auto; }
          #messages div { 
              margin-bottom: 10px; 
              padding: 10px; 
              border: 1px solid #ddd; 
              border-radius: 5px; 
              background: #e8f5e9;
          }
          #debug { background: #fff3e0; padding: 10px; border-radius: 5px; margin-bottom: 20px; }
          h3 { margin-top: 20px; }
      </style>
  </head>
  <body>
      <h1>PostMessage Test Page</h1>
      <p>This page tests cross-origin communication with postMessage.</p>
      
      <div id="debug"></div>
      
      <h3>Received Messages:</h3>
      <div id="messages"></div>
      
      <h3>Errors:</h3>
      <div id="errors"></div>
      
      <button onclick="window.parent.postMessage({type: 'TEST', time: new Date().toISOString()}, '*')">
          Send Test Message to Parent
      </button>
  </body>
  </html>
  `;
  
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
}

module.exports = { postMessageTestHandler };
