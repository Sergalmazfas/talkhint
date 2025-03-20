
import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { toast } from 'sonner';
import GPTService from '@/services/GPTService';

interface ApiSettingsQRCodeProps {
  onClose: () => void;
}

interface ApiSettings {
  apiKey: string | null;
  useServerProxy: boolean;
  serverProxyUrl: string;
  responseStyle: string;
}

const ApiSettingsQRCode: React.FC<ApiSettingsQRCodeProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<string>('generate');
  const [code, setCode] = useState<string>('');
  const [codeValue, setCodeValue] = useState<string>('');

  // Generate a settings QR code based on current settings
  const generateSettingsCode = () => {
    try {
      const settings: ApiSettings = {
        apiKey: GPTService.getApiKey(),
        useServerProxy: GPTService.getUseServerProxy(),
        serverProxyUrl: GPTService.getServerProxyUrl(),
        responseStyle: GPTService.getResponseStyle()
      };
      
      // Generate a random 6-digit code
      const newCode = Math.floor(100000 + Math.random() * 900000).toString();
      setCode(newCode);
      
      // Store settings in localStorage with the code as key
      const settingsJson = JSON.stringify(settings);
      localStorage.setItem(`settings_share_${newCode}`, settingsJson);
      
      // Auto-expire after 10 minutes
      setTimeout(() => {
        localStorage.removeItem(`settings_share_${newCode}`);
      }, 10 * 60 * 1000);
      
      toast.success('Код сгенерирован. Действителен 10 минут');
    } catch (error) {
      console.error('Error generating settings code:', error);
      toast.error('Ошибка при генерации кода настроек');
    }
  };

  // Apply settings from a code
  const applySettingsFromCode = () => {
    try {
      if (!codeValue || codeValue.length !== 6) {
        toast.error('Введите правильный 6-значный код');
        return;
      }
      
      const settingsJson = localStorage.getItem(`settings_share_${codeValue}`);
      if (!settingsJson) {
        toast.error('Код недействителен или истек');
        return;
      }
      
      const settings: ApiSettings = JSON.parse(settingsJson);
      
      // Apply settings
      if (settings.apiKey) {
        GPTService.setApiKey(settings.apiKey);
      }
      
      GPTService.setUseServerProxy(settings.useServerProxy);
      
      if (settings.serverProxyUrl) {
        GPTService.setServerProxyUrl(settings.serverProxyUrl);
      }
      
      if (settings.responseStyle) {
        GPTService.setResponseStyle(settings.responseStyle);
      }
      
      toast.success('Настройки успешно импортированы');
      onClose();
    } catch (error) {
      console.error('Error applying settings from code:', error);
      toast.error('Ошибка при применении настроек');
    }
  };

  return (
    <div className="space-y-4 p-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generate">Поделиться настройками</TabsTrigger>
          <TabsTrigger value="scan">Получить настройки</TabsTrigger>
        </TabsList>
        
        <TabsContent value="generate" className="space-y-4 mt-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Поделитесь вашими настройками OpenAI API с другими устройствами
            </p>
            
            <Button 
              onClick={generateSettingsCode} 
              className="mb-4"
            >
              Сгенерировать код
            </Button>
            
            {code && (
              <div className="space-y-4">
                <div className="font-mono text-2xl tracking-wider text-center font-bold">
                  {code}
                </div>
                <p className="text-sm text-muted-foreground">
                  Введите этот код на другом устройстве для передачи настроек.
                  Код действителен 10 минут.
                </p>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="scan" className="space-y-4 mt-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Введите 6-значный код с другого устройства
            </p>
            
            <div className="flex justify-center mb-4">
              <InputOTP 
                maxLength={6} 
                value={codeValue} 
                onChange={setCodeValue}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            
            <Button
              onClick={applySettingsFromCode}
              disabled={!codeValue || codeValue.length !== 6}
            >
              Применить настройки
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ApiSettingsQRCode;
