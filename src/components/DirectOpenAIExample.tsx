
import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import GPTService from '@/services/gpt';
import { setupMessageListener, testPostMessageAllOrigins, testIframePostMessage } from '@/utils/postMessage';
import { ALLOWED_ORIGINS } from '@/services/gpt/config/GPTServiceConfig';
import TestIframe from './TestIframe';

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
    const cleanupListener = setupMessageListener((event) => {
      // Extract data and origin from the event
      const { data, origin } = event;
      console.log(`Received message from ${origin}:`, data);
      
      // Проверяем, не пустое ли сообщение
      if (!data) {
        console.warn(`Empty message received from ${origin}`);
        return;
      }
      
      // Добавляем сообщение в список, ограничивая 50 последними сообщениями
      setMessages(prev => {
        const newMessages = [...prev, { origin, data, timestamp: new Date().toISOString() }];
        return newMessages.slice(-50); // Держим только 50 последних сообщений
      });
    });

    if (iframeRef.current && iframeRef.current.contentWindow) {
      setTimeout(() => {
        try {
          let targetOrigin = '*';
          
          try {
            targetOrigin = new URL(iframeRef.current!.src).origin;
          } catch (e) {
            console.warn('Could not parse iframe URL, using wildcard origin:', e);
          }
          
          const initMessage = { 
            type: 'INIT', 
            from: window.location.origin,
            timestamp: new Date().toISOString()
          };
          
          if (targetOrigin !== '*') {
            iframeRef.current!.contentWindow!.postMessage(initMessage, targetOrigin);
            console.log(`Initial postMessage sent to iframe at ${targetOrigin}`);
          }
          
          if (process.env.NODE_ENV === 'development') {
            iframeRef.current!.contentWindow!.postMessage(initMessage, '*');
            console.log(`Also sent initial message with wildcard origin (debug mode)`);
          }
        } catch (e) {
          console.error('Failed to send initial postMessage to iframe:', e);
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
      setResponse(JSON.stringify(result, null, 2));
    } catch (err) {
      console.error('Error calling API:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const testPostMessage = () => {
    try {
      setError(null);
      setTestResults(null);
      
      try {
        window.parent.postMessage(
          { type: 'TEST_MESSAGE', content: prompt, from: window.location.origin },
          window.location.origin
        );
        console.log(`Sent test message to parent (same origin: ${window.location.origin})`);
      } catch (e) {
        console.error('Error sending to parent window:', e);
      }
      
      if (iframeRef.current) {
        const success = testIframePostMessage(iframeRef.current, { 
          type: 'TEST_MESSAGE', 
          content: prompt, 
          from: window.location.origin 
        });
        
        if (success) {
          console.log('Successfully sent message to iframe');
        } else {
          console.warn('Failed to send message to iframe');
        }
      }
      
      const results = testPostMessageAllOrigins({
        type: 'DOMAIN_TEST',
        content: prompt,
        from: window.location.origin
      });
      
      setTestResults(results);
      
      setResponse(`Sent test message:\n${JSON.stringify({ 
        type: 'TEST_MESSAGE', 
        content: prompt 
      }, null, 2)}\n\nDomain testing results:\n${
        Object.entries(results)
          .map(([domain, success]) => `${domain}: ${success ? '✅' : '❌'}`)
          .join('\n')
      }`);
      
    } catch (error) {
      console.error('Error while testing postMessage:', error);
      setError(`Testing error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const reloadIframe = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
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
                    {JSON.stringify(msg.data, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => setMessages([])}>
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
          Allowed domains for postMessage: {ALLOWED_ORIGINS.join(', ')}
        </p>
      </CardFooter>
    </Card>
  );
};

export default DirectOpenAIExample;
