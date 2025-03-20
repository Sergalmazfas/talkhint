
import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import GPTService from '@/services/gpt';
import { setupMessageListener } from '@/utils/safePostMessage';
import { ALLOWED_ORIGINS } from '@/services/gpt/config/GPTServiceConfig';

const DirectOpenAIExample = () => {
  const [prompt, setPrompt] = useState<string>('Write a one-sentence bedtime story about a unicorn.');
  const [response, setResponse] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<'client' | 'proxy' | 'chat'>('client');
  const [messages, setMessages] = useState<any[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Определяем URL сервера в зависимости от окружения
  const getServerUrl = () => {
    // В production используем Vercel URL
    if (window.location.hostname === 'lovable.dev') {
      return 'https://lovable-server.vercel.app';
    }
    // Для разработки используем локальный сервер
    return 'http://localhost:3000';
  };

  // Настройка обработчика postMessage
  useEffect(() => {
    const cleanupListener = setupMessageListener((data, origin) => {
      console.log(`Received message from ${origin}:`, data);
      setMessages(prev => [...prev, { origin, data, timestamp: new Date().toISOString() }]);
    });

    return cleanupListener;
  }, []);

  // Безопасная отправка postMessage в iframe
  const sendMessageToIframe = (message: any) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      const targetOrigin = new URL(iframeRef.current.src).origin;
      
      if (ALLOWED_ORIGINS.some(origin => targetOrigin.startsWith(origin))) {
        iframeRef.current.contentWindow.postMessage(message, targetOrigin);
        console.log(`Sent message to iframe at ${targetOrigin}:`, message);
        return true;
      } else {
        console.error(`Target origin ${targetOrigin} is not allowed for postMessage`);
        setError(`Невозможно отправить сообщение к ${targetOrigin}: домен не разрешен`);
        return false;
      }
    }
    return false;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setResponse('');

    try {
      if (method === 'chat') {
        // Use the chat API
        const result = await GPTService.sendChatMessage(prompt);
        setResponse(JSON.stringify(result, null, 2));
      } else if (method === 'client') {
        // Direct OpenAI client method
        const client = GPTService.getOpenAIClient();
        
        if (!client) {
          setError('OpenAI client not available. Please set your API key in Settings.');
          setLoading(false);
          return;
        }

        const completion = await client.chat.completions.create({
          model: "gpt-4o-mini", // Using smaller model for efficiency
          messages: [{
            role: "user",
            content: prompt,
          }],
          temperature: 0.7,
          max_tokens: 150,
        });

        setResponse(completion.choices[0].message.content || 'No response received');
      } else {
        // Proxy server method
        const serverUrl = getServerUrl();
        console.log(`Making request to proxy server: ${serverUrl}`);
        
        const response = await fetch(`${serverUrl}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Origin': window.location.origin,
          },
          body: JSON.stringify({
            message: prompt
          }),
          mode: 'cors',
          credentials: 'omit'
        });

        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }

        const data = await response.json();
        setResponse(JSON.stringify(data, null, 2));
      }
    } catch (err) {
      console.error('Error calling API:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const testPostMessage = () => {
    // Отправка сообщения в родительское окно (если это iframe)
    window.parent.postMessage(
      { type: 'TEST_MESSAGE', content: prompt, from: window.location.origin },
      // Используем * только для тестирования, в продакшен коде всегда указывайте конкретный origin
      '*'
    );
    
    // Отправка сообщения в iframe (если он есть)
    if (iframeRef.current) {
      sendMessageToIframe({ 
        type: 'TEST_MESSAGE', 
        content: prompt, 
        from: window.location.origin 
      });
    }
    
    setResponse(`Отправлено тестовое сообщение:\n${JSON.stringify({ type: 'TEST_MESSAGE', content: prompt }, null, 2)}`);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>API Example</CardTitle>
        <CardDescription>
          Отправка сообщений через различные методы API
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Ошибка</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <Tabs value={method} onValueChange={(v) => setMethod(v as 'client' | 'proxy' | 'chat')}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="client">OpenAI Client</TabsTrigger>
            <TabsTrigger value="proxy">Прокси-сервер</TabsTrigger>
            <TabsTrigger value="chat">Lovable API</TabsTrigger>
          </TabsList>
          <TabsContent value="client">
            <p className="text-sm text-muted-foreground mb-4">
              Прямое использование OpenAI API с вашим ключом API
            </p>
          </TabsContent>
          <TabsContent value="proxy">
            <p className="text-sm text-muted-foreground mb-4">
              Использование прокси-сервера: {getServerUrl()}
            </p>
          </TabsContent>
          <TabsContent value="chat">
            <p className="text-sm text-muted-foreground mb-4">
              Использование API Lovable для прямого обмена сообщениями
            </p>
          </TabsContent>
        </Tabs>
        
        <div className="space-y-2">
          <label htmlFor="prompt" className="text-sm font-medium">
            Ваше сообщение
          </label>
          <Textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Введите ваше сообщение здесь..."
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
                Отправка...
              </>
            ) : (
              'Отправить API запрос'
            )}
          </Button>
          
          <Button 
            onClick={testPostMessage}
            variant="outline"
            disabled={loading || !prompt.trim()}
          >
            Тест postMessage
          </Button>
        </div>

        {response && (
          <div className="space-y-2 mt-4">
            <h3 className="text-sm font-medium">Ответ:</h3>
            <div className="bg-muted p-4 rounded-md whitespace-pre-wrap overflow-auto max-h-64">
              {response}
            </div>
          </div>
        )}

        {messages.length > 0 && (
          <div className="space-y-2 mt-4">
            <h3 className="text-sm font-medium">Полученные сообщения:</h3>
            <div className="bg-muted p-4 rounded-md overflow-auto max-h-64">
              {messages.map((msg, idx) => (
                <div key={idx} className="mb-2 pb-2 border-b border-gray-200">
                  <p><strong>От:</strong> {msg.origin}</p>
                  <p><strong>Время:</strong> {msg.timestamp}</p>
                  <pre className="text-xs mt-1 whitespace-pre-wrap">
                    {JSON.stringify(msg.data, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Тестовый iframe для проверки postMessage */}
        <div className="mt-4 p-4 border rounded-md">
          <h3 className="text-sm font-medium mb-2">Тестовый iframe:</h3>
          <iframe
            ref={iframeRef}
            src={`${getServerUrl()}/health`}
            className="w-full h-40 border rounded"
            title="Тестовый iframe"
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        </div>
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground w-full text-center">
          Разрешенные домены для postMessage: {ALLOWED_ORIGINS.join(', ')}
        </p>
      </CardFooter>
    </Card>
  );
};

export default DirectOpenAIExample;
