
import React, { forwardRef, useEffect, useState } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle, Lock, Globe } from 'lucide-react';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

interface TestIframeProps {
  serverUrl: string;
  onReload?: () => void;
}

const TestIframe = forwardRef<HTMLIFrameElement, TestIframeProps>(
  ({ serverUrl, onReload }, ref) => {
    const [httpsWarning, setHttpsWarning] = useState<boolean>(false);
    const [connectionStatus, setConnectionStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [serverProtocol, setServerProtocol] = useState<'http' | 'https' | 'unknown'>('unknown');
    
    // Select URL for iframe considering potential CORS issues
    const getIframeUrl = () => {
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
      }
      
      // Use special test endpoint instead of /health
      const testUrl = `${serverUrl}/postmessage-test`;
      console.log(`[TestIframe] Using test URL: ${testUrl}`);
      return testUrl;
    };

    // Handle iframe load
    const handleIframeLoad = () => {
      console.log('[TestIframe] Iframe loaded successfully');
      setConnectionStatus('success');
    };

    // Handle iframe load error
    const handleIframeError = () => {
      console.error('[TestIframe] Error loading iframe');
      setConnectionStatus('error');
    };
    
    // Check connection status on mount and URL change
    useEffect(() => {
      setConnectionStatus('loading');
      console.log(`[TestIframe] Testing connection to ${serverUrl}`);
      
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
      
      // Test server connection with both /health and /postmessage-test endpoints
      const testEndpoints = async () => {
        try {
          // Try health endpoint first
          const healthResponse = await fetch(`${serverUrl}/health`, { 
            mode: 'no-cors',
            cache: 'no-cache',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Origin': window.location.origin
            }
          });
          
          console.log(`[TestIframe] Health endpoint response:`, healthResponse);
          
          // Then try postmessage-test endpoint
          const testResponse = await fetch(`${serverUrl}/postmessage-test`, { 
            mode: 'no-cors',
            cache: 'no-cache',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Origin': window.location.origin
            }
          });
          
          console.log(`[TestIframe] PostMessage test endpoint response:`, testResponse);
          setConnectionStatus('success');
        } catch (error) {
          console.error('[TestIframe] Server connection test failed:', error);
          setConnectionStatus('error');
        }
      };
      
      testEndpoints();
    }, [serverUrl]);

    // Define additional attributes for iframe
    const getSandboxAttributes = () => {
      // In development mode, give more permissions
      if (process.env.NODE_ENV === 'development') {
        return "allow-scripts allow-same-origin allow-forms allow-popups";
      }
      
      // In production, restrict permissions for security
      return "allow-scripts allow-same-origin allow-forms";
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
              <Lock className="h-4 w-4 text-green-500" title="HTTPS connection" />
            ) : serverProtocol === 'http' ? (
              <Globe className="h-4 w-4 text-amber-500" title="HTTP connection" />
            ) : null}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onReload}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
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
          <p className="text-xs text-muted-foreground">
            This iframe is configured to test message exchange between different domains.
            {process.env.NODE_ENV === 'development' && 
              ' Extended permissions are enabled in development mode.'}
          </p>
        </div>
      </div>
    );
  }
);

TestIframe.displayName = 'TestIframe';

export default TestIframe;
