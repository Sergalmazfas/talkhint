
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogTitle, DialogHeader } from '@/components/ui/dialog';
import { QrCode, Share2, AlertTriangle, ShieldCheck, Info, Loader2, Save, CheckCircle, XCircle } from 'lucide-react';
import GPTService from '@/services/gpt';
import { toast } from 'sonner';
import ApiSettingsQRCode from './ApiSettingsQRCode';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: {
    sensitivity: number;
    responseStyle: string;
    autoActivate: boolean;
  };
  onSettingsChange: (key: string, value: any) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ 
  isOpen, 
  onClose, 
  settings, 
  onSettingsChange 
}) => {
  const [apiKey, setApiKey] = useState('');
  const [useProxy, setUseProxy] = useState(true);
  const [serverUrl, setServerUrl] = useState('');
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<boolean | null>(null);
  const [showQRCodeDialog, setShowQRCodeDialog] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [serverOnly, setServerOnly] = useState(true);
  const [serverKeyStatus, setServerKeyStatus] = useState<{hasKey: boolean, keyInfo?: any} | null>(null);
  const [isSavingKeyToServer, setIsSavingKeyToServer] = useState(false);
  const [isVerifyingKey, setIsVerifyingKey] = useState(false);
  const [verifyKeyResult, setVerifyKeyResult] = useState<{success: boolean, message: string, models?: string[]} | null>(null);

  const validateApiKey = (key: string): boolean => {
    if (!key || key.trim() === '') return true; // Empty is allowed with proxy
    return key.trim().startsWith('sk-') && key.trim().length > 20;
  };
  
  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newKey = e.target.value;
    setApiKey(newKey);
    
    if (!useProxy && newKey.trim() !== '' && !validateApiKey(newKey)) {
      setApiKeyError('API ключ должен начинаться с "sk-" и быть достаточной длины');
    } else {
      setApiKeyError(null);
    }
  };

  const getDefaultServerUrl = () => {
    const hostname = window.location.hostname;
    if (hostname.includes('localhost')) {
      return 'http://localhost:3000/api';
    }
    return window.location.origin + '/api';
  };
  
  const resetServerUrlToDefault = () => {
    const defaultUrl = getDefaultServerUrl();
    setServerUrl(defaultUrl);
    return defaultUrl;
  };
  
  // Check server key status
  const checkServerKeyStatus = async () => {
    try {
      const response = await fetch(`${serverUrl}/key-status`);
      if (response.ok) {
        const data = await response.json();
        setServerKeyStatus(data);
        if (data.hasKey) {
          toast.success(`Ключ API найден на сервере: ${data.keyInfo.prefix}...${data.keyInfo.suffix}`);
        } else {
          toast.info('API ключ не найден на сервере');
        }
      } else {
        const errorText = await response.text();
        console.error('Error checking key status:', errorText);
        setServerKeyStatus(null);
        toast.error('Ошибка при проверке статуса ключа API на сервере');
      }
    } catch (error) {
      console.error('Error checking server key status:', error);
      setServerKeyStatus(null);
      toast.error('Невозможно соединиться с сервером для проверки статуса ключа API');
    }
  };
  
  // Save API key to server
  const saveKeyToServer = async () => {
    if (!apiKey || !validateApiKey(apiKey)) {
      toast.error('Неверный формат API ключа');
      return;
    }
    
    setIsSavingKeyToServer(true);
    try {
      const response = await fetch(`${serverUrl}/save-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success(`Ключ API успешно сохранен на сервере: ${data.keyPrefix}...${data.keySuffix}`);
          // Refresh key status
          checkServerKeyStatus();
        } else {
          toast.error(`Ошибка при сохранении ключа: ${data.message}`);
        }
      } else {
        const errorData = await response.json();
        toast.error(`Ошибка при сохранении ключа: ${errorData.message || 'Неизвестная ошибка'}`);
      }
    } catch (error) {
      console.error('Error saving key to server:', error);
      toast.error('Не удалось соединиться с сервером для сохранения ключа API');
    } finally {
      setIsSavingKeyToServer(false);
    }
  };
  
  // Verify API key with server
  const verifyApiKey = async () => {
    if (!apiKey || !validateApiKey(apiKey)) {
      toast.error('Неверный формат API ключа');
      return;
    }
    
    setIsVerifyingKey(true);
    setVerifyKeyResult(null);
    try {
      const response = await fetch(`${serverUrl}/verify-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey }),
      });
      
      const data = await response.json();
      setVerifyKeyResult(data);
      
      if (data.success) {
        toast.success('API ключ успешно верифицирован!');
      } else {
        toast.error(`Проверка API ключа не удалась: ${data.message}`);
      }
    } catch (error) {
      console.error('Error verifying API key:', error);
      setVerifyKeyResult({
        success: false,
        message: error instanceof Error ? error.message : 'Неизвестная ошибка при проверке ключа'
      });
      toast.error('Не удалось соединиться с сервером для проверки ключа API');
    } finally {
      setIsVerifyingKey(false);
    }
  };
  
  useEffect(() => {
    if (isOpen) {
      const currentKey = GPTService.getApiKey() || '';
      setApiKey(currentKey);
      setUseProxy(GPTService.getUseServerProxy());
      setServerOnly(true); // Always use server-only mode
      
      const currentServerUrl = GPTService.getServerProxyUrl();
      if (currentServerUrl.includes('thingproxy.freeboard.io')) {
        const defaultUrl = resetServerUrlToDefault();
        GPTService.setServerProxyUrl(defaultUrl);
      } else {
        setServerUrl(currentServerUrl);
      }
      
      // Check for API key on server
      checkServerKeyStatus();
      checkApiConnection();
    }
  }, [isOpen]);
  
  useEffect(() => {
    if (!useProxy && apiKey && !validateApiKey(apiKey)) {
      setApiKeyError('API ключ должен начинаться с "sk-" и быть достаточной длины');
    } else {
      setApiKeyError(null);
    }
  }, [useProxy]);
  
  if (!isOpen) return null;

  const checkApiConnection = async () => {
    setCheckingConnection(true);
    setConnectionStatus(null);
    
    try {
      const connected = await GPTService.checkConnection();
      setConnectionStatus(connected);
      
      if (connected) {
        toast.success('Подключение к OpenAI API успешно');
      } else {
        if (!GPTService.getApiKey() && !useProxy) {
          toast.error('API ключ необходим для прямого подключения к OpenAI API');
        } else {
          toast.error('Не удалось подключиться к OpenAI API');
        }
      }
    } catch (error) {
      setConnectionStatus(false);
      toast.error('Ошибка при проверке подключения');
      console.error('Connection check error:', error);
    } finally {
      setCheckingConnection(false);
    }
  };

  const handleSave = () => {
    if (serverOnly) {
      GPTService.setUseServerProxy(true);
    } else {
      if (!useProxy && apiKey.trim() !== '' && !validateApiKey(apiKey)) {
        toast.error('Неверный формат API ключа. Ключ должен начинаться с "sk-"');
        return;
      }
      
      GPTService.setUseServerProxy(useProxy);
    }
    
    if (serverUrl && serverUrl.trim() !== '') {
      GPTService.setServerProxyUrl(serverUrl.trim());
    } else {
      const defaultUrl = resetServerUrlToDefault();
      GPTService.setServerProxyUrl(defaultUrl);
    }
    
    if (!serverOnly && apiKey.trim()) {
      GPTService.setApiKey(apiKey.trim());
      toast.success('API ключ сохранен');
    } else if (!serverOnly && !useProxy) {
      toast.warning('API ключ необходим для прямых запросов к OpenAI');
    }
    
    GPTService.setResponseStyle(settings.responseStyle);
    toast.success('Настройки сохранены');
    
    checkApiConnection();
    
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="bg-background rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Настройки</h2>
            <div className="flex">
              <Button variant="ghost" size="icon" onClick={() => setShowQRCodeDialog(true)} title="Поделиться настройками">
                <Share2 size={18} />
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </Button>
            </div>
          </div>

          <Button 
            className="w-full mb-6" 
            onClick={handleSave}
          >
            <Save className="mr-2 h-4 w-4" />
            Сохранить
          </Button>

          <div className="space-y-6">
            {connectionStatus !== null && (
              <Alert variant={connectionStatus ? "default" : "destructive"} className={connectionStatus ? "bg-green-50 border-green-200" : ""}>
                <AlertDescription>
                  {connectionStatus 
                    ? "✅ Подключение к OpenAI API успешно установлено" 
                    : "❌ Проблема с подключением к OpenAI API"}
                </AlertDescription>
              </Alert>
            )}
            
            <Alert variant="default" className="bg-blue-50 border-blue-200">
              <ShieldCheck className="h-4 w-4 text-blue-500" />
              <AlertTitle>Серверный режим включен</AlertTitle>
              <AlertDescription className="text-sm">
                В этом режиме API ключ хранится только на сервере и не требуется вводить его в настройках приложения.
                Это более безопасный и рекомендуемый подход.
              </AlertDescription>
            </Alert>

            {/* Server API Key Status */}
            <div className="mt-2 p-4 bg-gray-50 rounded-lg border">
              <h3 className="text-sm font-medium mb-2">Статус API ключа на сервере:</h3>
              {serverKeyStatus ? (
                <>
                  {serverKeyStatus.hasKey ? (
                    <div className="flex items-center text-green-700">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      <p className="text-sm">
                        Ключ установлен: {serverKeyStatus.keyInfo.prefix}...{serverKeyStatus.keyInfo.suffix}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center text-amber-700">
                      <XCircle className="h-4 w-4 mr-2" />
                      <p className="text-sm">Ключ не установлен на сервере</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500">Загрузка информации о ключе...</p>
              )}
              
              <Button
                size="sm"
                variant="outline"
                className="mt-2 w-full"
                onClick={checkServerKeyStatus}
              >
                Проверить статус ключа
              </Button>
            </div>
            
            {/* Server Key Management */}
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
              <h3 className="text-sm font-medium">Управление API ключом на сервере</h3>
              
              <div className="space-y-3">
                <Label htmlFor="apiKey" className="text-sm text-foreground/80">
                  OpenAI API ключ
                </Label>
                <Input
                  id="apiKey"
                  type="text" 
                  value={apiKey}
                  onChange={handleApiKeyChange}
                  placeholder="sk-..."
                  className={apiKeyError ? "border-red-300" : ""}
                />
                {apiKeyError && (
                  <p className="text-xs text-red-500">{apiKeyError}</p>
                )}
                
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    onClick={saveKeyToServer}
                    disabled={isSavingKeyToServer || !validateApiKey(apiKey) || !apiKey.trim()}
                    className="w-full"
                  >
                    {isSavingKeyToServer ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Сохранение...</>
                    ) : (
                      <>Сохранить на сервере</>
                    )}
                  </Button>
                  
                  <Button 
                    onClick={verifyApiKey}
                    disabled={isVerifyingKey || !validateApiKey(apiKey) || !apiKey.trim()}
                    className="w-full" 
                    variant="outline"
                  >
                    {isVerifyingKey ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Проверка...</>
                    ) : (
                      <>Проверить ключ</>
                    )}
                  </Button>
                </div>
                
                {verifyKeyResult && (
                  <Alert variant={verifyKeyResult.success ? "default" : "destructive"} className={verifyKeyResult.success ? "bg-green-50 border-green-200" : ""}>
                    <AlertDescription className="text-xs">
                      {verifyKeyResult.success ? (
                        <>
                          ✅ API ключ верифицирован!
                          {verifyKeyResult.models && (
                            <div className="mt-1">
                              <span className="font-semibold">Доступные модели:</span>
                              <ul className="list-disc pl-5 mt-1">
                                {verifyKeyResult.models.map((model, idx) => (
                                  <li key={idx}>{model}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </>
                      ) : (
                        <>❌ Ошибка проверки: {verifyKeyResult.message}</>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="serverUrl" className="text-sm text-foreground/80">
                URL сервера
              </Label>
              <div className="flex gap-2">
                <Input
                  id="serverUrl"
                  type="text"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder={getDefaultServerUrl()}
                  className="text-xs flex-1"
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={resetServerUrlToDefault}
                  title="Сбросить к значению по умолчанию"
                >
                  Сбросить
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                URL вашего сервера (по умолчанию использует текущий домен)
              </p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="sensitivity" className="text-sm text-foreground/80">
                Чувствительность микрофона
              </Label>
              <Slider
                id="sensitivity"
                min={0}
                max={100}
                step={1}
                value={[settings.sensitivity]}
                onValueChange={(value) => onSettingsChange('sensitivity', value[0])}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Низкая</span>
                <span>Высокая</span>
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="responseStyle" className="text-sm text-foreground/80">
                Стиль ответов
              </Label>
              <Select
                value={settings.responseStyle}
                onValueChange={(value) => onSettingsChange('responseStyle', value)}
              >
                <SelectTrigger id="responseStyle" className="w-full">
                  <SelectValue placeholder="Выберите стиль" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="casual">Повседневный</SelectItem>
                  <SelectItem value="formal">Формальный</SelectItem>
                  <SelectItem value="friendly">Дружелюбный</SelectItem>
                  <SelectItem value="professional">Профессиональный</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="autoActivate" className="text-sm text-foreground/80">
                Автоактивация во время звонков
              </Label>
              <Switch
                id="autoActivate"
                checked={settings.autoActivate}
                onCheckedChange={(checked) => onSettingsChange('autoActivate', checked)}
              />
            </div>
          </div>
        </div>
      </motion.div>

      <Dialog open={showQRCodeDialog} onOpenChange={setShowQRCodeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Поделиться настройками</DialogTitle>
          </DialogHeader>
          <ApiSettingsQRCode onClose={() => setShowQRCodeDialog(false)} />
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default SettingsPanel;
