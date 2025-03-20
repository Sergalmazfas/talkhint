import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Mic, MicOff, PhoneCall as PhoneIcon, MessageCircle, ArrowLeft, Speaker, Settings } from 'lucide-react';
import ListeningIndicator from '@/components/ListeningIndicator';
import BilingualResponsePanel from '@/components/BilingualResponsePanel';
import SpeechService from '@/services/SpeechService';
import GPTService from '@/services/GPTService';
import { PROXY_SERVERS } from '@/services/gpt/config/GPTServiceConfig';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

const PhoneCall = () => {
  const [isListening, setIsListening] = useState(false);
  const [isCallActive, setIsCallActive] = useState(true);
  const [transcribedText, setTranscribedText] = useState('');
  const [bilingualResponses, setBilingualResponses] = useState<Array<{english: string, russian: string}>>([]);
  const [showBilingualResponses, setShowBilingualResponses] = useState(false);
  const [isApiConnected, setIsApiConnected] = useState<boolean | null>(null);
  
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [useServerProxy, setUseServerProxy] = useState(() => GPTService.getUseServerProxy());
  const [selectedProxy, setSelectedProxy] = useState('');
  const [proxyTesting, setProxyTesting] = useState(false);

  const toggleCall = () => {
    if (isCallActive) {
      if (isListening) {
        stopListening();
      }
      setIsCallActive(false);
      toast.info('Звонок завершен');
      setShowBilingualResponses(false);
    } else {
      setIsCallActive(true);
      toast.success('Звонок начат');
    }
  };

  const startListening = () => {
    if (!isCallActive) {
      toast.error('Невозможно включить микрофон: звонок не активен');
      return;
    }
    
    if (!SpeechService.isAvailable()) {
      toast.error('Распознавание речи не поддерживается в вашем браузере');
      setTimeout(() => {
        if (SpeechService.isAvailable()) {
          toast.success('Распознавание речи инициализировано');
        }
      }, 1000);
      return;
    }
    try {
      SpeechService.startListening(
        (text) => {
          console.log('Transcribed text:', text);
          setTranscribedText(text);
        },
        handleFinalTranscription
      );
      setIsListening(true);
      toast.success('Микрофон включен');
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      toast.error('Ошибка при включении микрофона. Пожалуйста, попробуйте еще раз.');
    }
  };

  const stopListening = () => {
    if (SpeechService.isCurrentlyListening()) {
      SpeechService.stopListening();
      setIsListening(false);
      toast.info('Микрофон выключен');
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleFinalTranscription = async (text: string) => {
    console.log('Final transcription:', text);
    if (text.trim().length > 0) {
      try {
        if (!isApiConnected) {
          if (!GPTService.getApiKey() && !GPTService.getUseServerProxy()) {
            toast.error('API ключ необходим для прямых запросов к OpenAI');
            setShowSettings(true);
            return;
          }
          toast.error('Проблема с подключением к OpenAI API. Проверьте настройки.');
          return;
        }
        
        setShowBilingualResponses(false);
        toast.loading('Получение ответов...', { id: 'getting-responses' });
        
        try {
          const bilingualResult = await GPTService.getBilingualResponses(text);
          toast.dismiss('getting-responses');
          
          if (bilingualResult && bilingualResult.responses && bilingualResult.responses.length > 0) {
            console.log('Received responses:', bilingualResult.responses);
            setBilingualResponses(bilingualResult.responses);
            setShowBilingualResponses(true);
          } else {
            toast.error('Не удалось получить ответы от OpenAI API');
          }
        } catch (error) {
          console.error('Error getting responses:', error);
          toast.dismiss('getting-responses');
          
          if (error instanceof Error) {
            if (error.message.includes('API key not set') || 
                error.message.includes('API key is required') || 
                error.message.includes('missing API key')) {
              toast.error('Пожалуйста, установите API-ключ OpenAI в настройках');
              setShowSettings(true);
            } else if (error.message.includes('429') || error.message.includes('rate limit')) {
              toast.error('Превышен лимит запросов к OpenAI API. Попробуйте позже.');
            } else if (error.message.includes('401') || error.message.includes('unauthorized')) {
              toast.error('Неверный API ключ OpenAI. Проверьте настройки.');
              setShowSettings(true);
            } else {
              toast.error(`Ошибка OpenAI API: ${error.message.substring(0, 100)}`);
            }
          } else {
            toast.error('Неизвестная ошибка при получении ответов');
          }
        }
      } catch (error) {
        console.error('Error in final transcription handling:', error);
        toast.error('Ошибка при обработке запроса');
      }
    } else {
      console.log('Transcription too short, ignoring');
    }
  };

  const selectBilingualResponse = (response: {english: string, russian: string}) => {
    navigator.clipboard.writeText(response.russian).then(() => {
      toast.success('Ответ скопирован в буфер обмена');
    }).catch(() => {
      toast.error('Не удалось скопировать в буфер обмена');
    });
  };

  const checkApiConnection = async () => {
    console.log('Checking API connection...');
    
    try {
      const connected = await GPTService.checkConnection();
      setIsApiConnected(connected);
      console.log('API connection status:', connected ? 'Connected' : 'Not connected');
      
      // If not connected, check if we need to show settings
      if (!connected && !GPTService.getApiKey() && !GPTService.getUseServerProxy()) {
        setShowSettings(true);
      }
      
      return connected;
    } catch (error) {
      console.error('Error checking API connection:', error);
      setIsApiConnected(false);
      return false;
    }
  };

  const testProxyConnection = async (proxyUrl: string) => {
    setProxyTesting(true);
    try {
      // Save current settings to restore later
      const originalUrl = GPTService.getServerProxyUrl();
      const originalUseProxy = GPTService.getUseServerProxy();
      
      // Temporarily set the new proxy for testing
      GPTService.setServerProxyUrl(proxyUrl);
      GPTService.setUseServerProxy(true);
      
      const connected = await GPTService.checkConnection();
      
      // Restore original settings
      GPTService.setServerProxyUrl(originalUrl);
      GPTService.setUseServerProxy(originalUseProxy);
      
      if (connected) {
        toast.success(`Прокси ${getProxyName(proxyUrl)} работает!`);
      } else {
        toast.error(`Прокси ${getProxyName(proxyUrl)} не работает`);
      }
      
      return connected;
    } catch (error) {
      toast.error(`Ошибка при тестировании прокси: ${error instanceof Error ? error.message : 'неизвестная ошибка'}`);
      return false;
    } finally {
      setProxyTesting(false);
    }
  };

  const getProxyName = (url: string): string => {
    if (url.includes('allorigins')) return 'AllOrigins';
    if (url.includes('corsproxy.io')) return 'CORS Proxy';
    if (url.includes('thingproxy')) return 'ThingProxy';
    if (url === PROXY_SERVERS.DIRECT) return 'Без прокси';
    return 'Неизвестный прокси';
  };

  const saveSettings = () => {
    if (selectedProxy) {
      GPTService.setServerProxyUrl(selectedProxy);
      toast.success(`Прокси ${getProxyName(selectedProxy)} установлен`);
    }
    
    GPTService.setUseServerProxy(useServerProxy);
    toast.success(useServerProxy 
      ? 'Использование прокси-сервера включено' 
      : 'Прямое подключение к API включено');
    
    if (apiKey.trim()) {
      GPTService.setApiKey(apiKey.trim());
      toast.success('API ключ сохранен');
    } else if (!useServerProxy) {
      toast.warning('API ключ необходим для прямых запросов к OpenAI');
    }
    
    setShowSettings(false);
    
    checkApiConnection().then(connected => {
      if (connected) {
        toast.success('Подключение к OpenAI API успешно');
      } else {
        if (!useServerProxy && !apiKey.trim()) {
          toast.error('API ключ необходим для прямого подключения к OpenAI API');
          setShowSettings(true);
        } else {
          toast.warning('Проверка подключения к OpenAI API не удалась. Продолжаем с текущими настройками.');
        }
      }
    });
  };

  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
          console.log('Доступ к микрофону получен');
          toast.success('Доступ к микрофону получен');
          
          setIsCallActive(true);
          toast.success('Звонок начат');
          
          setUseServerProxy(GPTService.getUseServerProxy());
          
          checkApiConnection()
            .then(connected => {
              if (connected) {
                toast.success('Подключение к OpenAI API успешно');
                startListening();
              } else {
                toast.warning('Не удалось подключиться к OpenAI API. Проверьте настройки.');
                setShowSettings(true);
              }
            })
            .catch(err => {
              console.error('Error checking API connection:', err);
              toast.error('Ошибка при проверке подключения к API');
            });
        })
        .catch((err) => {
          console.error('Доступ к микрофону запрещен:', err);
          toast.error('Пожалуйста, разрешите доступ к микрофону для использования приложения');
        });
    } else {
      toast.error('Ваш браузер не поддерживает доступ к микрофону');
    }
    
    return () => {
      if (SpeechService.isCurrentlyListening()) {
        SpeechService.stopListening();
      }
    };
  }, []);

  useEffect(() => {
    if (!isCallActive && isListening) {
      stopListening();
    }
  }, [isCallActive, isListening]);

  useEffect(() => {
    if (showSettings) {
      setApiKey(GPTService.getApiKey() || '');
      setUseServerProxy(GPTService.getUseServerProxy());
      setSelectedProxy(GPTService.getServerProxyUrl());
    }
  }, [showSettings]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <div className="container max-w-md mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Link to="/" className="text-primary hover:text-primary/80 transition-colors">
              <ArrowLeft size={24} />
            </Link>
            <h1 className="text-2xl font-semibold ml-4">Телефонный разговор</h1>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setShowSettings(true)}
          >
            <Settings size={24} className="text-primary" />
          </Button>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="neo-morphism rounded-2xl p-6 mb-8"
        >
          <div className="text-center mb-6">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 ${isCallActive ? 'bg-green-500/20' : 'bg-primary/10'}`}>
              <PhoneIcon size={40} className={isCallActive ? 'text-green-500' : 'text-primary'} />
            </div>
            <h2 className="text-xl font-medium mb-2">
              {isCallActive ? 'Звонок активен' : 'Начать звонок'}
            </h2>
            {isApiConnected === false && (
              <div className="mb-2 p-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm">
                ⚠️ Проблема с подключением к OpenAI API. Проверьте настройки.
              </div>
            )}
            <p className="text-sm text-muted-foreground mb-6">
              {isCallActive 
                ? 'Громкая связь включена. GPT анализирует разговор и предлагает ответы' 
                : 'Нажмите чтобы начать звонок и включить громкую связь'}
            </p>
            
            <div className="flex flex-col space-y-4">
              <Button 
                size="lg" 
                onClick={toggleCall} 
                className={`w-full transition-all ${isCallActive ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
              >
                {isCallActive ? 'Завершить звонок' : 'Начать звонок'}
              </Button>
              
              {isCallActive && (
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={toggleListening} 
                  className={`w-full transition-all border-2 ${isListening ? 'border-red-500 text-red-500' : 'border-green-500 text-green-500'}`}
                >
                  {isListening ? (
                    <>
                      <MicOff size={18} className="mr-2" />
                      Выключить микрофон
                    </>
                  ) : (
                    <>
                      <Mic size={18} className="mr-2" />
                      Включить микрофон
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
          
          {isCallActive && (
            <div className="mt-6 p-4 rounded-xl bg-background/50 border border-border">
              <div className="flex items-center mb-2">
                <MessageCircle size={16} className="text-primary mr-2" />
                <h3 className="text-sm font-medium">Последние реплики</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {transcribedText || 'Говорите чтобы увидеть расшифровку разговора...'}
              </p>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="neo-morphism rounded-2xl p-5 mb-4"
        >
          <div className="flex items-center mb-3">
            <Speaker size={18} className="text-primary mr-2" />
            <h3 className="text-sm font-medium">Как использовать</h3>
          </div>
          <ul className="text-sm text-muted-foreground space-y-2 text-left">
            <li className="flex items-start">
              <span className="inline-block mr-2 mt-0.5">•</span>
              <span>Поставьте телефон на громкую связь и положите рядом с устройством</span>
            </li>
            <li className="flex items-start">
              <span className="inline-block mr-2 mt-0.5">•</span>
              <span>Приложение будет слушать разговор и предлагать варианты ответов</span>
            </li>
            <li className="flex items-start">
              <span className="inline-block mr-2 mt-0.5">•</span>
              <span>Нажмите на вариант ответа, чтобы скопировать его</span>
            </li>
          </ul>
        </motion.div>
      </div>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Настройки OpenAI API</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {isApiConnected !== null && (
              <Alert variant={isApiConnected ? "default" : "destructive"} className={isApiConnected ? "bg-green-50 border-green-200" : ""}>
                <AlertDescription>
                  {isApiConnected 
                    ? "✅ Подключение к OpenAI API успешно" 
                    : "❌ Проблема с подключением к OpenAI API"}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="use-proxy" className="text-sm font-medium">
                Использовать прокси-сервер
              </Label>
              <Switch
                id="use-proxy"
                checked={useServerProxy}
                onCheckedChange={setUseServerProxy}
              />
              <p className="text-xs text-muted-foreground">
                {useServerProxy 
                  ? "API запросы будут отправляться через прокси для обхода CORS" 
                  : "API запросы будут отправляться напрямую с использованием API ключа"}
              </p>
            </div>

            {useServerProxy && (
              <div className="space-y-2">
                <Label htmlFor="proxy-server" className="text-sm font-medium">
                  Выберите прокси-сервер
                </Label>
                <Select
                  value={selectedProxy}
                  onValueChange={setSelectedProxy}
                >
                  <SelectTrigger id="proxy-server">
                    <SelectValue placeholder="Выберите прокси-сервер" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PROXY_SERVERS.ALLORIGINS}>AllOrigins</SelectItem>
                    <SelectItem value={PROXY_SERVERS.CORSPROXY}>CORS Proxy</SelectItem>
                    <SelectItem value={PROXY_SERVERS.THINGPROXY}>ThingProxy</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex justify-end">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={!selectedProxy || proxyTesting}
                    onClick={() => testProxyConnection(selectedProxy)}
                  >
                    {proxyTesting ? 'Тестирование...' : 'Тест прокси'}
                  </Button>
                </div>
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="api-key" className="text-sm font-medium">
                API ключ OpenAI {!useServerProxy && <span className="text-red-500">*</span>}
              </Label>
              <Input
                id="api-key"
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {useServerProxy 
                  ? "Оставьте пустым, если используете прокси-сервер" 
                  : "Обязательно для прямого подключения к API"}
              </p>
            </div>

            <Alert>
              <InfoIcon className="h-4 w-4" />
              <AlertDescription>
                Если один прокси-сервер не работает, попробуйте другой
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowSettings(false)}
            >
              Отмена
            </Button>
            <Button onClick={saveSettings}>
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <ListeningIndicator 
        isListening={isListening} 
        transcribedText={transcribedText} 
      />
      
      {isCallActive && (
        <BilingualResponsePanel 
          responses={bilingualResponses}
          isVisible={showBilingualResponses}
          onSelect={selectBilingualResponse}
          onDismiss={() => setShowBilingualResponses(false)}
        />
      )}
    </div>
  );
};

export default PhoneCall;
