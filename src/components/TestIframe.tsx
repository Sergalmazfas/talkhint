
import React, { forwardRef, useEffect, useState } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
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
    
    // Выбираем URL для iframe с учетом потенциальных CORS-проблем
    const getIframeUrl = () => {
      // Проверяем, запущено ли приложение через HTTPS
      const isPageHttps = window.location.protocol === 'https:';
      
      // Если страница на HTTPS, а сервер на HTTP, генерируем предупреждение
      if (isPageHttps && serverUrl.startsWith('http:')) {
        setHttpsWarning(true);
        // Подменяем http: на https: для предотвращения проблем со смешанным контентом
        return serverUrl.replace('http:', 'https:') + '/postmessage-test';
      }
      
      // Используем специальный тестовый endpoint вместо /health
      return `${serverUrl}/postmessage-test`;
    };

    // Обработчик загрузки iframe
    const handleIframeLoad = () => {
      setConnectionStatus('success');
    };

    // Обработчик ошибки загрузки iframe
    const handleIframeError = () => {
      setConnectionStatus('error');
    };
    
    // Проверяем статус соединения при монтировании и изменении URL
    useEffect(() => {
      setConnectionStatus('loading');
      
      // Проверяем наличие протокола в URL
      if (!serverUrl.startsWith('http:') && !serverUrl.startsWith('https:')) {
        console.warn('Server URL does not include protocol, this may cause issues');
      }
      
      // Проверяем смешанный контент
      const isPageHttps = window.location.protocol === 'https:';
      if (isPageHttps && serverUrl.startsWith('http:')) {
        setHttpsWarning(true);
        console.warn('Mixed content: page is HTTPS but server is HTTP, this will be blocked by browsers');
      } else {
        setHttpsWarning(false);
      }
      
      // Тестируем соединение с сервером
      fetch(`${serverUrl}/health`, { mode: 'no-cors' })
        .then(() => {
          setConnectionStatus('success');
        })
        .catch((error) => {
          console.error('Server connection test failed:', error);
          setConnectionStatus('error');
        });
    }, [serverUrl]);

    // Определяем дополнительные атрибуты для iframe
    const getSandboxAttributes = () => {
      // В режиме разработки даем больше разрешений
      if (process.env.NODE_ENV === 'development') {
        return "allow-scripts allow-same-origin allow-forms allow-popups";
      }
      
      // В production ограничиваем разрешения для безопасности
      return "allow-scripts allow-same-origin allow-forms";
    };

    // Определяем URL для iframe
    const iframeUrl = getIframeUrl();

    return (
      <div className="mt-4 p-4 border rounded-md">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-medium">Тестовый iframe:</h3>
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
            <AlertTitle>Предупреждение о смешанном контенте</AlertTitle>
            <AlertDescription>
              Страница загружена через HTTPS, а сервер использует HTTP. 
              Браузеры блокируют смешанный контент. Используйте HTTPS для сервера или 
              запустите это приложение через HTTP.
            </AlertDescription>
          </Alert>
        )}
        
        {connectionStatus === 'error' && (
          <Alert variant="destructive" className="mb-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Ошибка соединения с сервером</AlertTitle>
            <AlertDescription>
              Не удалось подключиться к серверу. Убедитесь, что сервер запущен 
              и доступен по адресу: {serverUrl}
            </AlertDescription>
          </Alert>
        )}
        
        {connectionStatus === 'success' && (
          <Alert variant="default" className="mb-2 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertTitle>Соединение установлено</AlertTitle>
            <AlertDescription>
              Успешное подключение к серверу по адресу: {serverUrl}
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
            title="Тестовый iframe для postMessage"
            sandbox={getSandboxAttributes()}
            allow="allow-scripts; allow-same-origin; allow-forms"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
          />
          <p className="text-xs text-muted-foreground">
            Этот iframe настроен для тестирования обмена сообщениями между разными доменами.
            {process.env.NODE_ENV === 'development' && 
              ' В режиме разработки включены расширенные разрешения.'}
          </p>
        </div>
      </div>
    );
  }
);

TestIframe.displayName = 'TestIframe';

export default TestIframe;
