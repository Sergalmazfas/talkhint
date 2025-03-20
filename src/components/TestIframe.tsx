
import React, { forwardRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

interface TestIframeProps {
  serverUrl: string;
  onReload?: () => void;
}

const TestIframe = forwardRef<HTMLIFrameElement, TestIframeProps>(
  ({ serverUrl, onReload }, ref) => {
    // Выбираем URL для iframe с учетом потенциальных CORS-проблем
    const getIframeUrl = () => {
      // Используем специальный тестовый endpoint вместо /health
      return `${serverUrl}/postmessage-test`;
    };

    // Определяем дополнительные атрибуты для iframe
    const getSandboxAttributes = () => {
      // В режиме разработки даем больше разрешений
      if (process.env.NODE_ENV === 'development') {
        return "allow-scripts allow-same-origin allow-forms allow-popups";
      }
      
      // В production ограничиваем разрешения для безопасности
      return "allow-scripts allow-same-origin allow-forms";
    };

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
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">
            URL: <code>{getIframeUrl()}</code>
          </div>
          <iframe
            ref={ref}
            src={getIframeUrl()}
            className="w-full h-40 border rounded"
            title="Тестовый iframe для postMessage"
            sandbox={getSandboxAttributes()}
            allow="allow-scripts; allow-same-origin; allow-forms"
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
