
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogTitle, DialogHeader } from '@/components/ui/dialog';
import { QrCode, Share2, AlertTriangle } from 'lucide-react';
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
  
  // Validate API key format
  const validateApiKey = (key: string): boolean => {
    if (!key || key.trim() === '') return true; // Empty is allowed with proxy
    return key.trim().startsWith('sk-') && key.trim().length > 20;
  };
  
  // Handle API key change with validation
  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newKey = e.target.value;
    setApiKey(newKey);
    
    if (!useProxy && newKey.trim() !== '' && !validateApiKey(newKey)) {
      setApiKeyError('API ключ должен начинаться с "sk-" и быть достаточной длины');
    } else {
      setApiKeyError(null);
    }
  };

  // Get default server URL based on environment
  const getDefaultServerUrl = () => {
    const hostname = window.location.hostname;
    if (hostname.includes('localhost')) {
      return 'http://localhost:3000/api';
    }
    return window.location.origin + '/api';
  };
  
  // Reset server URL to default
  const resetServerUrlToDefault = () => {
    const defaultUrl = getDefaultServerUrl();
    setServerUrl(defaultUrl);
    return defaultUrl;
  };
  
  // Load settings when opening
  useEffect(() => {
    if (isOpen) {
      const currentKey = GPTService.getApiKey() || '';
      setApiKey(currentKey);
      setUseProxy(GPTService.getUseServerProxy());
      
      const currentServerUrl = GPTService.getServerProxyUrl();
      // If the current URL is thingproxy, reset it to our default
      if (currentServerUrl.includes('thingproxy.freeboard.io')) {
        const defaultUrl = resetServerUrlToDefault();
        GPTService.setServerProxyUrl(defaultUrl);
      } else {
        setServerUrl(currentServerUrl);
      }
      
      checkApiConnection();
    }
  }, [isOpen]);
  
  // Update validation when proxy setting changes
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
    // Validate API key if direct connection is used
    if (!useProxy && apiKey.trim() !== '' && !validateApiKey(apiKey)) {
      toast.error('Неверный формат API ключа. Ключ должен начинаться с "sk-"');
      return;
    }
    
    // Update proxy settings
    GPTService.setUseServerProxy(useProxy);
    
    // Update server URL if provided
    if (serverUrl && serverUrl.trim() !== '') {
      GPTService.setServerProxyUrl(serverUrl.trim());
    } else {
      // If empty, use the default URL
      const defaultUrl = resetServerUrlToDefault();
      GPTService.setServerProxyUrl(defaultUrl);
    }
    
    // Set API key if provided
    if (apiKey.trim()) {
      GPTService.setApiKey(apiKey.trim());
      toast.success('API ключ сохранен');
    } else if (!useProxy) {
      // Warn if no key is provided for direct connection
      toast.warning('API ключ необходим для прямых запросов к OpenAI');
    }
    
    // Set response style
    GPTService.setResponseStyle(settings.responseStyle);
    toast.success('Настройки сохранены');
    
    // Check connection with new settings
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
          <div className="flex justify-between items-center mb-6">
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

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="useProxy" className="text-sm text-foreground/80">
                  Использовать серверный прокси
                </Label>
                <Switch
                  id="useProxy"
                  checked={useProxy}
                  onCheckedChange={setUseProxy}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {useProxy 
                  ? "Запросы отправляются через ваш сервер, который использует свой API ключ" 
                  : "Запросы отправляются напрямую с использованием вашего API ключа"}
              </p>
            </div>

            {useProxy && (
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
            )}

            <div className="space-y-3">
              <Label htmlFor="apiKey" className="text-sm text-foreground/80">
                OpenAI API Key {!useProxy && <span className="text-red-500">*</span>}
              </Label>
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={handleApiKeyChange}
                placeholder="sk-..."
                className={`font-mono text-xs ${apiKeyError ? 'border-red-500' : ''}`}
              />
              {apiKeyError && (
                <div className="flex items-start gap-2 mt-1 text-red-500 text-xs">
                  <AlertTriangle size={14} className="mt-0.5" />
                  <span>{apiKeyError}</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {useProxy 
                  ? "API ключ опционален при использовании прокси-сервера (сервер использует собственный ключ)" 
                  : "API ключ обязателен для прямого подключения к OpenAI API"}
              </p>
              {!useProxy && (
                <p className="text-xs text-amber-600">
                  Ключ должен начинаться с "sk-" и иметь правильный формат
                </p>
              )}
            </div>

            <Button 
              onClick={checkApiConnection} 
              variant="outline" 
              className="w-full"
              disabled={checkingConnection}
            >
              {checkingConnection ? "Проверка..." : "Проверить подключение"}
            </Button>

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
        
        <div className="p-4 border-t border-border">
          <Button 
            className="w-full" 
            onClick={handleSave}
            disabled={!useProxy && apiKeyError !== null}
          >
            Сохранить
          </Button>
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
