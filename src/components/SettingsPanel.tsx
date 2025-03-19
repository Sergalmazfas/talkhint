
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import GPTService from '@/services/gpt';
import { toast } from 'sonner';

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
  const [useProxy, setUseProxy] = useState(false);
  const [serverUrl, setServerUrl] = useState('http://localhost:3000/chat');
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<boolean | null>(null);
  
  // Load settings when opening
  useEffect(() => {
    if (isOpen) {
      const currentKey = GPTService.getApiKey() || '';
      setApiKey(currentKey);
      setUseProxy(GPTService.getUseServerProxy());
      checkApiConnection();
    }
  }, [isOpen]);
  
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
          toast.error('API ключ необходим для подключения к OpenAI API');
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
    // Update proxy settings
    GPTService.setUseServerProxy(useProxy);
    
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
            <Button variant="ghost" size="icon" onClick={onClose}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </Button>
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
                  Использовать Express прокси-сервер
                </Label>
                <Switch
                  id="useProxy"
                  checked={useProxy}
                  onCheckedChange={setUseProxy}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {useProxy 
                  ? "Запросы отправляются через ваш Express сервер, избегая проблем с CORS" 
                  : "Запросы отправляются напрямую с использованием вашего API ключа"}
              </p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="apiKey" className="text-sm text-foreground/80">
                OpenAI API Key {!useProxy && <span className="text-red-500">*</span>}
              </Label>
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                {!useProxy 
                  ? "API ключ обязателен для прямого подключения" 
                  : "При использовании прокси, API ключ используется на сервере (в env переменной)"}
              </p>
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
          <Button className="w-full" onClick={handleSave}>
            Сохранить
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SettingsPanel;
