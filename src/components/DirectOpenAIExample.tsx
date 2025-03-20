
import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import GPTService from '@/services/gpt';
import { setupMessageListener } from '@/utils/postMessage/receiver';
import { safePostMessage } from '@/utils/postMessage/sender';
import { ALLOWED_ORIGINS } from '@/services/gpt/config/GPTServiceConfig';
import { safeStringify } from '@/utils/postMessage/constants';
import TestIframe from './TestIframe';
import { toast } from 'sonner';

const DirectOpenAIExample = () => {
  const [prompt, setPrompt] = useState<string>('Write a one-sentence bedtime story about a unicorn.');
  const [response, setResponse] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [testResults, setTestResults] = useState<Record<string, boolean> | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const getServerUrl = () => {
    if (window.location.hostname === 'lovable.dev') {
      return 'https://lovable-server.vercel.app';
    }
    return window.location.protocol + '//' + window.location.hostname + ':3000';
  };

  useEffect(() => {
    // Use the improved setupMessageListener from receiver.ts
    const cleanupListener = setupMessageListener((event) => {
      try {
        // Log the event for debugging
        console.log(`[DirectOpenAIExample] Received message from ${event.origin}:`, event.data);
        
        // Проверяем, не пустое ли сообщение
        if (!event.data) {
          console.warn(`[DirectOpenAIExample] Empty message received from ${event.origin}`);
          return;
        }
        
        // Добавляем сообщение в список, ограничивая 50 последними сообщениями
        setMessages(prev => {
          const newMessages = [...prev, { 
            origin: event.origin, 
            data: event.data, 
            timestamp: new Date().toISOString() 
          }];
          return newMessages.slice(-50); // Держим только 50 последних сообщений
        });
      } catch (error) {
        console.error('[DirectOpenAIExample] Error handling message:', error);
      }
    });

    // Send initial message to iframe after a short delay
    if (iframeRef.current && iframeRef.current.contentWindow) {
      setTimeout(() => {
        try {
          console.log('[DirectOpenAIExample] Attempting to send initial message to iframe');
          
          const initMessage = { 
            type: 'INIT', 
            from: window.location.origin,
            timestamp: new Date().toISOString()
          };
          
          // Try to determine the iframe's origin for sending
          let targetOrigin = '*';
          try {
            if (iframeRef.current?.src) {
              targetOrigin = new URL(iframeRef.current.src).origin;
              console.log(`[DirectOpenAIExample] Determined iframe origin: ${targetOrigin}`);
            }
          } catch (e) {
            console.warn('[DirectOpenAIExample] Could not parse iframe URL, using wildcard origin:', e);
          }
          
          // Use our safe postMessage function instead of direct call
          const success = safePostMessage(
            window, 
            iframeRef.current.contentWindow, 
            initMessage,
            targetOrigin
          );
          
          if (success) {
            console.log('[DirectOpenAIExample] Successfully sent initial message to iframe');
          } else {
            console.warn('[DirectOpenAIExample] Failed to send initial message to iframe');
          }
        } catch (e) {
          console.error('[DirectOpenAIExample] Error sending initial message to iframe:', e);
        }
      }, 1500);
    }

    return cleanupListener;
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setResponse('');

    try {
      const result = await GPTService.sendChatMessage(prompt);
      setResponse(safeStringify(result));
      toast.success('Message sent successfully');
    } catch (err) {
      console.error('Error calling API:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const testPostMessage = () => {
    try {
      setError(null);
      setTestResults(null);
      
      // Test message to send
      const testMessage = { 
        type: 'TEST_MESSAGE', 
        content: prompt, 
        from: window.location.origin,
        timestamp: new Date().toISOString()
      };
      
      // Try sending to parent window
      try {
        if (window.parent !== window) {
          const success = safePostMessage(window, window.parent, testMessage, window.location.origin);
          console.log(`[testPostMessage] Sent to parent window: ${success ? 'success' : 'failed'}`);
        }
      } catch (e) {
        console.error('[testPostMessage] Error sending to parent window:', e);
      }
      
      // Try sending to iframe if it exists
      if (iframeRef.current && iframeRef.current.contentWindow) {
        try {
          let targetOrigin = '*';
          
          try {
            if (iframeRef.current.src) {
              targetOrigin = new URL(iframeRef.current.src).origin;
            }
          } catch (e) {
            console.warn('[testPostMessage] Could not parse iframe URL, using wildcard origin');
          }
          
          const success = safePostMessage(
            window, 
            iframeRef.current.contentWindow, 
            testMessage,
            targetOrigin
          );
          
          if (success) {
            console.log('[testPostMessage] Successfully sent test message to iframe');
            setResponse(`Sent test message to iframe at ${targetOrigin}:\n${safeStringify(testMessage)}`);
            toast.success('Test message sent to iframe');
          } else {
            console.warn('[testPostMessage] Failed to send test message to iframe');
            setError('Failed to send test message to iframe');
            toast.error('Failed to send test message to iframe');
          }
        } catch (e) {
          console.error('[testPostMessage] Error sending to iframe:', e);
          setError(`Error: ${e instanceof Error ? e.message : String(e)}`);
        }
      } else {
        console.warn('[testPostMessage] Iframe reference not available');
        setError('Iframe reference not available');
      }
    } catch (error) {
      console.error('[testPostMessage] Error while testing postMessage:', error);
      setError(`Testing error: ${error instanceof Error ? error.message : String(error)}`);
      toast.error('Error testing postMessage');
    }
  };

  const reloadIframe = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
      toast.info('Iframe reloaded');
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>API Example</CardTitle>
        <CardDescription>
          Send messages through the server
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <p className="text-sm text-muted-foreground mb-4">
          Using proxy server: {getServerUrl()}
        </p>
        
        <div className="space-y-2">
          <label htmlFor="prompt" className="text-sm font-medium">
            Your message
          </label>
          <Textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your message here..."
            className="min-h-24"
          />
        </div>

        <div className="flex space-x-2">
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !prompt.trim()}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Send API Request'
            )}
          </Button>
          
          <Button 
            onClick={testPostMessage}
            variant="outline"
            disabled={loading || !prompt.trim()}
          >
            Test postMessage
          </Button>
        </div>

        {testResults && (
          <div className="space-y-2 mt-4">
            <h3 className="text-sm font-medium">Domain testing results:</h3>
            <div className="bg-muted p-4 rounded-md">
              <ul className="space-y-1">
                {Object.entries(testResults).map(([domain, success]) => (
                  <li key={domain} className="flex items-center">
                    <span className={`mr-2 ${success ? 'text-green-500' : 'text-red-500'}`}>
                      {success ? '✅' : '❌'}
                    </span>
                    <code className="text-xs">{domain}</code>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {response && (
          <div className="space-y-2 mt-4">
            <h3 className="text-sm font-medium">Response:</h3>
            <div className="bg-muted p-4 rounded-md whitespace-pre-wrap overflow-auto max-h-64">
              {response}
            </div>
          </div>
        )}

        {messages.length > 0 && (
          <div className="space-y-2 mt-4">
            <h3 className="text-sm font-medium">Received messages:</h3>
            <div className="bg-muted p-4 rounded-md overflow-auto max-h-64">
              {messages.map((msg, idx) => (
                <div key={idx} className="mb-2 pb-2 border-b border-gray-200 text-xs">
                  <p><strong>From:</strong> {msg.origin}</p>
                  <p><strong>Time:</strong> {msg.timestamp}</p>
                  <pre className="text-xs mt-1 whitespace-pre-wrap overflow-auto max-h-20">
                    {safeStringify(msg.data)}
                  </pre>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => {
              setMessages([]);
              toast.success('Messages cleared');
            }}>
              Clear messages
            </Button>
          </div>
        )}
        
        <TestIframe 
          ref={iframeRef}
          serverUrl={getServerUrl()}
          onReload={reloadIframe}
        />
      </CardContent>
      <CardFooter className="flex-col">
        <p className="text-xs text-muted-foreground w-full text-center mb-2">
          Your current origin: <code>{window.location.origin}</code>
        </p>
        <p className="text-xs text-muted-foreground w-full text-center">
          Allowed domains for postMessage: {ALLOWED_ORIGINS.length} domains configured
        </p>
      </CardFooter>
    </Card>
  );
};

export default DirectOpenAIExample;
