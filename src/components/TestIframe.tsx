
import React, { forwardRef, useEffect, useState, useCallback } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle, Lock, Globe } from 'lucide-react';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface TestIframeProps {
  serverUrl: string;
  onReload?: () => void;
}

const TestIframe = forwardRef<HTMLIFrameElement, TestIframeProps>(
  ({ serverUrl, onReload }, ref) => {
    const [httpsWarning, setHttpsWarning] = useState<boolean>(false);
    const [connectionStatus, setConnectionStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [serverProtocol, setServerProtocol] = useState<'http' | 'https' | 'unknown'>('unknown');
    const [messagesSent, setMessagesSent] = useState<number>(0);
    const [messagesReceived, setMessagesReceived] = useState<number>(0);
    const [errors, setErrors] = useState<string[]>([]);
    
    // Select URL for iframe considering potential CORS issues
    const getIframeUrl = useCallback(() => {
      // Check if the app is running over HTTPS
      const isPageHttps = window.location.protocol === 'https:';
      
      try {
        // Extract protocol from server URL
        if (serverUrl.startsWith('https:')) {
          setServerProtocol('https');
        } else if (serverUrl.startsWith('http:')) {
          setServerProtocol('http');
        }
        
        // If page is HTTPS but server is HTTP, generate warning
        if (isPageHttps && serverUrl.startsWith('http:')) {
          setHttpsWarning(true);
          console.log(`[TestIframe] Mixed content warning: page is HTTPS but server is HTTP (${serverUrl})`);
          
          // For testing purposes, attempt both protocols
          const httpsUrl = serverUrl.replace('http:', 'https:') + '/postmessage-test';
          console.log(`[TestIframe] Attempting HTTPS URL: ${httpsUrl}`);
          return httpsUrl;
        }
      } catch (e) {
        console.error('[TestIframe] Error parsing server URL:', e);
        setErrors(prev => [...prev, `Error parsing URL: ${e instanceof Error ? e.message : String(e)}`]);
      }
      
      // Use special test endpoint instead of /health
      const testUrl = `${serverUrl}/postmessage-test`;
      console.log(`[TestIframe] Using test URL: ${testUrl}`);
      return testUrl;
    }, [serverUrl]);

    // Setup postMessage event listener
    useEffect(() => {
      const handleMessage = (event: MessageEvent) => {
        try {
          console.log(`[TestIframe] Received message from ${event.origin}:`, event.data);
          
          // Verify the message is from our iframe
          const iframeUrl = getIframeUrl();
          let iframeOrigin = '*';
          
          try {
            // Extract origin from iframe URL
            const url = new URL(iframeUrl);
            iframeOrigin = url.origin;
          } catch (e) {
            console.warn('[TestIframe] Could not parse iframe URL:', e);
          }
          
          if (event.data && (event.origin === iframeOrigin || 
              event.origin.includes('localhost') || 
              event.origin.includes('lovable') ||
              process.env.NODE_ENV === 'development')) {
            setMessagesReceived(prev => prev + 1);
          }
        } catch (error) {
          console.error('[TestIframe] Error handling message:', error);
          setErrors(prev => [...prev, `Error handling message: ${error instanceof Error ? error.message : String(error)}`]);
        }
      };
      
      // Add listener
      window.addEventListener('message', handleMessage);
      
      // Cleanup
      return () => {
        window.removeEventListener('message', handleMessage);
      };
    }, [getIframeUrl]);

    // Handle iframe load
    const handleIframeLoad = () => {
      console.log('[TestIframe] Iframe loaded successfully');
      setConnectionStatus('success');
      
      // Send init message to iframe
      const iframe = ref as React.RefObject<HTMLIFrameElement>;
      if (iframe && iframe.current && iframe.current.contentWindow) {
        try {
          const message = {
            type: 'PARENT_INIT',
            timestamp: new Date().toISOString(),
            origin: window.location.origin
          };
          
          // Try with wildcard first (most compatible)
          iframe.current.contentWindow.postMessage(message, '*');
          console.log('[TestIframe] Sent init message with wildcard origin');
          
          // Also try with specific origin
          const iframeUrl = getIframeUrl();
          try {
            const url = new URL(iframeUrl);
            iframe.current.contentWindow.postMessage(message, url.origin);
            console.log(`[TestIframe] Also sent with specific origin: ${url.origin}`);
          } catch (e) {
            console.warn('[TestIframe] Could not send with specific origin:', e);
          }
          
          setMessagesSent(prev => prev + 1);
        } catch (error) {
          console.error('[TestIframe] Error sending init message:', error);
          setErrors(prev => [...prev, `Error sending message: ${error instanceof Error ? error.message : String(error)}`]);
        }
      }
    };

    // Handle iframe load error
    const handleIframeError = () => {
      console.error('[TestIframe] Error loading iframe');
      setConnectionStatus('error');
      setErrors(prev => [...prev, 'Failed to load iframe']);
    };
    
    // Check connection status on mount and URL change
    useEffect(() => {
      setConnectionStatus('loading');
      console.log(`[TestIframe] Testing connection to ${serverUrl}`);
      setErrors([]);
      
      // Check if URL includes protocol
      if (!serverUrl.startsWith('http:') && !serverUrl.startsWith('https:')) {
        console.warn('[TestIframe] Server URL does not include protocol, this may cause issues');
      }
      
      // Check for mixed content
      const isPageHttps = window.location.protocol === 'https:';
      if (isPageHttps && serverUrl.startsWith('http:')) {
        setHttpsWarning(true);
        console.warn('[TestIframe] Mixed content: page is HTTPS but server is HTTP, this will be blocked by browsers');
      } else {
        setHttpsWarning(false);
      }
      
      // Test server connection with fetch (no-cors) to check if server is reachable
      const testEndpoints = async () => {
        try {
          // Create AbortController for timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          // Try health endpoint first
          console.log(`[TestIframe] Testing health endpoint: ${serverUrl}/health`);
          const healthResponse = await fetch(`${serverUrl}/health`, { 
            mode: 'no-cors',
            cache: 'no-cache',
            signal: controller.signal,
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Origin': window.location.origin
            }
          });
          
          // Clear timeout
          clearTimeout(timeoutId);
          
          console.log(`[TestIframe] Health endpoint response:`, healthResponse);
          setConnectionStatus('success');
        } catch (error) {
          console.error('[TestIframe] Server connection test failed:', error);
          setConnectionStatus('error');
          setErrors(prev => [...prev, `Connection test failed: ${error instanceof Error ? error.message : String(error)}`]);
        }
      };
      
      testEndpoints();
    }, [serverUrl]);

    // Define additional attributes for iframe
    const getSandboxAttributes = () => {
      return "allow-scripts allow-same-origin allow-forms allow-popups";
    };
    
    // Send test message to iframe
    const sendTestMessage = () => {
      const iframe = ref as React.RefObject<HTMLIFrameElement>;
      if (iframe && iframe.current && iframe.current.contentWindow) {
        try {
          const message = {
            type: 'TEST_MESSAGE',
            timestamp: new Date().toISOString(),
            origin: window.location.origin
          };
          
          // Try with wildcard (most compatible)
          iframe.current.contentWindow.postMessage(message, '*');
          console.log('[TestIframe] Sent test message with wildcard origin');
          
          // Try with specific origin if possible
          try {
            const iframeUrl = getIframeUrl();
            const url = new URL(iframeUrl);
            iframe.current.contentWindow.postMessage(message, url.origin);
            console.log(`[TestIframe] Also sent test with specific origin: ${url.origin}`);
          } catch (e) {
            console.warn('[TestIframe] Could not send with specific origin:', e);
          }
          
          setMessagesSent(prev => prev + 1);
        } catch (error) {
          console.error('[TestIframe] Error sending test message:', error);
          setErrors(prev => [...prev, `Error sending test message: ${error instanceof Error ? error.message : String(error)}`]);
        }
      }
    };

    // Determine URL for iframe
    const iframeUrl = getIframeUrl();
    console.log(`[TestIframe] Using iframe URL: ${iframeUrl}`);

    return (
      <div className="mt-4 p-4 border rounded-md">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center">
            <h3 className="text-sm font-medium mr-2">Test iframe:</h3>
            {serverProtocol === 'https' ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span><Lock className="h-4 w-4 text-green-500" /></span>
                  </TooltipTrigger>
                  <TooltipContent>HTTPS connection</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : serverProtocol === 'http' ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span><Globe className="h-4 w-4 text-amber-500" /></span>
                  </TooltipTrigger>
                  <TooltipContent>HTTP connection</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={sendTestMessage}
              className="h-6"
            >
              Test Message
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onReload}
              className="h-6 w-6 p-0"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {httpsWarning && (
          <Alert variant="default" className="mb-2 border-yellow-500 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <AlertTitle>Mixed Content Warning</AlertTitle>
            <AlertDescription>
              Page is loaded over HTTPS, but server uses HTTP. 
              Browsers block mixed content. Use HTTPS for server or 
              run this app over HTTP.
            </AlertDescription>
          </Alert>
        )}
        
        {connectionStatus === 'error' && (
          <Alert variant="destructive" className="mb-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Server Connection Error</AlertTitle>
            <AlertDescription>
              Failed to connect to server. Make sure the server is running 
              and accessible at: {serverUrl}
            </AlertDescription>
          </Alert>
        )}
        
        {connectionStatus === 'success' && (
          <Alert variant="default" className="mb-2 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertTitle>Connection Established</AlertTitle>
            <AlertDescription>
              Successfully connected to server at: {serverUrl}
            </AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">
            URL: <code>{iframeUrl}</code>
          </div>
          <iframe
            ref={ref}
            src={iframeUrl}
            className="w-full h-40 border rounded"
            title="Test iframe for postMessage"
            sandbox={getSandboxAttributes()}
            allow="allow-scripts; allow-same-origin; allow-forms"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
          />
          
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <div>
              Messages: Sent ({messagesSent}), Received ({messagesReceived})
            </div>
            <div>
              {process.env.NODE_ENV === 'development' ? 'DEV Mode' : 'PROD Mode'}
            </div>
          </div>
          
          {errors.length > 0 && (
            <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700">
              <p className="font-medium">Errors:</p>
              <ul className="list-disc list-inside">
                {errors.slice(-3).map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
                {errors.length > 3 && <li>...and {errors.length - 3} more</li>}
              </ul>
            </div>
          )}
          
          <p className="text-xs text-muted-foreground">
            This iframe tests message exchange between domains. All permissions enabled with sandbox="{getSandboxAttributes()}".
          </p>
        </div>
      </div>
    );
  }
);

TestIframe.displayName = 'TestIframe';

export default TestIframe;
