import React, { forwardRef, useEffect, useState, useCallback, useRef } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle, Lock, Globe, Info } from 'lucide-react';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { toast } from 'sonner';

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
    const [reactErrors, setReactErrors] = useState<string[]>([]);
    const iframeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const messageHandlerRef = useRef<((event: MessageEvent) => void) | null>(null);
    const debugHandlerRef = useRef<((event: MessageEvent) => void) | null>(null);
    
    // Предотвращаем множественное добавление обработчиков сообщений
    const setupListenersOnce = useRef<boolean>(false);
    
    // Добавляем функцию для отображения ошибки
    const addError = useCallback((error: string) => {
      setErrors(prev => {
        // Проверяем, нет ли уже такой ошибки
        if (prev.includes(error)) return prev;
        // Добавляем новую ошибку в начало списка
        return [error, ...prev].slice(0, 10); // Ограничиваем список 10 ошибками
      });
    }, []);
    
    // Функция для отображения ошибок React
    const addReactError = useCallback((error: string) => {
      setReactErrors(prev => {
        if (prev.includes(error)) return prev;
        return [error, ...prev].slice(0, 3); // Ограничиваем 3 ошибками
      });
      
      // Также показываем тост с ошибкой
      toast.error('React Error Detected', {
        description: error.substring(0, 100) + (error.length > 100 ? '...' : ''),
        duration: 5000,
      });
    }, []);
    
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
        addError(`Error parsing URL: ${e instanceof Error ? e.message : String(e)}`);
      }
      
      // Use special test endpoint instead of /health
      const testUrl = `${serverUrl}/postmessage-test`;
      console.log(`[TestIframe] Using test URL: ${testUrl}`);
      return testUrl;
    }, [serverUrl, addError]);

    // Setup postMessage event listener ONCE
    useEffect(() => {
      // Проверяем, не установлены ли уже обработчики
      if (setupListenersOnce.current) return;
      
      // Помечаем, что обработчики уже установлены
      setupListenersOnce.current = true;
      
      const handleMessage = (event: MessageEvent) => {
        try {
          console.log(`[TestIframe] Received message from ${event.origin}:`, event.data);
          
          // Обрабатываем сообщения об ошибках React
          if (event.data && event.data.type === 'REACT_ERROR') {
            console.error('[TestIframe] React error reported from iframe:', event.data.error);
            addReactError(event.data.error);
            return;
          }
          
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
          
          // Более мягкая проверка origin для тестирования
          const isSameOrigin = event.origin === iframeOrigin;
          const isAllowedDomain = event.origin.includes('localhost') || 
                                 event.origin.includes('lovable') ||
                                 process.env.NODE_ENV === 'development';
          
          if (event.data && (isSameOrigin || isAllowedDomain)) {
            setMessagesReceived(prev => prev + 1);
            
            // Для отладки показываем полученное сообщение
            console.log('[TestIframe] Processed message:', event.data);
          }
        } catch (error) {
          console.error('[TestIframe] Error handling message:', error);
          addError(`Error handling message: ${error instanceof Error ? error.message : String(error)}`);
        }
      };
      
      // Debug listener to see ALL messages regardless of origin
      const debugHandler = (event: MessageEvent) => {
        console.log(`[DEBUG] Raw message received from ${event.origin || 'unknown'}:`, event.data);
      };
      
      // Сохраняем ссылки на обработчики, чтобы правильно удалить их при размонтировании
      messageHandlerRef.current = handleMessage;
      debugHandlerRef.current = debugHandler;
      
      // Add listeners
      window.addEventListener('message', handleMessage);
      window.addEventListener('message', debugHandler, true); // Use capture phase
      
      // Cleanup
      return () => {
        if (messageHandlerRef.current) {
          window.removeEventListener('message', messageHandlerRef.current);
          messageHandlerRef.current = null;
        }
        
        if (debugHandlerRef.current) {
          window.removeEventListener('message', debugHandlerRef.current, true);
          debugHandlerRef.current = null;
        }
        
        // Сбрасываем флаг, чтобы обработчики можно было установить снова
        setupListenersOnce.current = false;
      };
    }, [getIframeUrl, addError, addReactError]);

    // Handle iframe load
    const handleIframeLoad = () => {
      console.log('[TestIframe] Iframe loaded successfully');
      setConnectionStatus('success');
      
      // Clear timeout if it exists
      if (iframeTimeoutRef.current) {
        clearTimeout(iframeTimeoutRef.current);
        iframeTimeoutRef.current = null;
      }
      
      // Send init message to iframe only ONCE after loading
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
          addError(`Error sending message: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    };

    // Handle iframe load error
    const handleIframeError = () => {
      console.error('[TestIframe] Error loading iframe');
      setConnectionStatus('error');
      addError('Failed to load iframe');
    };
    
    // Check connection status ONCE on mount and URL change
    useEffect(() => {
      setConnectionStatus('loading');
      console.log(`[TestIframe] Testing connection to ${serverUrl}`);
      setErrors([]);
      
      // Set a timeout for iframe loading
      iframeTimeoutRef.current = setTimeout(() => {
        if (connectionStatus === 'loading') {
          setConnectionStatus('error');
          addError('Iframe loading timeout - no response after 10 seconds');
        }
      }, 10000);
      
      // Check if URL includes protocol
      if (!serverUrl.startsWith('http:') && !serverUrl.startsWith('https:')) {
        console.warn('[TestIframe] Server URL does not include protocol, this may cause issues');
        addError('Server URL missing protocol (http:// or https://)');
      }
      
      // Check for mixed content
      const isPageHttps = window.location.protocol === 'https:';
      if (isPageHttps && serverUrl.startsWith('http:')) {
        setHttpsWarning(true);
        console.warn('[TestIframe] Mixed content: page is HTTPS but server is HTTP, this will be blocked by browsers');
      } else {
        setHttpsWarning(false);
      }
      
      // Cleanup
      return () => {
        if (iframeTimeoutRef.current) {
          clearTimeout(iframeTimeoutRef.current);
          iframeTimeoutRef.current = null;
        }
      };
    }, [serverUrl, addError]); // Убрали connectionStatus из зависимостей - это вызывало лишние ререндеры

    // Define additional attributes for iframe with maximum permissions
    const getSandboxAttributes = () => {
      return "allow-scripts allow-same-origin allow-forms allow-popups allow-downloads allow-modals allow-presentation";
    };
    
    // Send test message to iframe
    const sendTestMessage = () => {
      const iframe = ref as React.RefObject<HTMLIFrameElement>;
      if (iframe && iframe.current && iframe.current.contentWindow) {
        try {
          const message = {
            type: 'TEST_MESSAGE',
            timestamp: new Date().toISOString(),
            origin: window.location.origin,
            counter: messagesSent + 1
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
          
          // Показываем тост об успешной отправке
          toast.success('Test message sent', {
            description: `Message #${messagesSent + 1} sent to iframe`,
            duration: 2000,
          });
        } catch (error) {
          console.error('[TestIframe] Error sending test message:', error);
          addError(`Error sending test message: ${error instanceof Error ? error.message : String(error)}`);
          
          // Показываем тост об ошибке
          toast.error('Failed to send message', {
            description: error instanceof Error ? error.message : String(error),
            duration: 3000,
          });
        }
      }
    };

    // Determine URL for iframe
    const iframeUrl = getIframeUrl();
    
    // Функция очистки ошибок для пользователя
    const clearErrors = () => {
      setErrors([]);
      setReactErrors([]);
      toast.success('Errors cleared');
    };

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
              variant="outline" 
              size="sm" 
              onClick={clearErrors}
              className="h-6"
              disabled={errors.length === 0 && reactErrors.length === 0}
            >
              Clear Errors
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
        
        {reactErrors.length > 0 && (
          <Alert variant="destructive" className="mb-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>React Error Detected</AlertTitle>
            <AlertDescription>
              <div className="text-xs overflow-auto max-h-20">
                {reactErrors[0]}
              </div>
              {reactErrors.length > 1 && (
                <div className="text-xs mt-1">
                  And {reactErrors.length - 1} more errors...
                </div>
              )}
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
            allow="allow-scripts; allow-same-origin; allow-forms; allow-modals; allow-popups"
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
                {errors.slice(0, 3).map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
                {errors.length > 3 && <li>...and {errors.length - 3} more</li>}
              </ul>
            </div>
          )}
          
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <Info className="h-3 w-3" />
            <p>
              This iframe tests message exchange between domains. Sandbox="{getSandboxAttributes()}"
            </p>
          </div>
        </div>
      </div>
    );
  }
);

TestIframe.displayName = 'TestIframe';

export default TestIframe;
