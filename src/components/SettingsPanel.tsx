
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
import { QrCode, Share2, Server, InfoIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import GPTService from '@/services/gpt';
import { toast } from 'sonner';
import ApiSettingsQRCode from './ApiSettingsQRCode';
import { PROXY_SERVERS } from '@/services/gpt/config/GPTServiceConfig';

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
  const [serverUrl, setServerUrl] = useState('');
  const [selectedProxyServer, setSelectedProxyServer] = useState('VERCEL');
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<boolean | null>(null);
  const [showQRCodeDialog, setShowQRCodeDialog] = useState(false);
  
  const isProduction = window.location.hostname === 'lovable.dev';
  
  useEffect(() => {
    if (isOpen) {
      const currentKey = GPTService.getApiKey() || '';
      setApiKey(currentKey);
      
      const currentProxyUrl = GPTService.getServerProxyUrl();
      const proxyEntries = Object.entries(PROXY_SERVERS);
      const foundProxy = proxyEntries.find(([_, url]) => url === currentProxyUrl);
      if (foundProxy) {
        setSelectedProxyServer(foundProxy[0]);
      }
      
      setServerUrl(currentProxyUrl);
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
        toast.success('Connection to server successful');
      } else {
        toast.error('Failed to connect to server');
      }
    } catch (error) {
      setConnectionStatus(false);
      toast.error('Error checking connection');
      console.error('Connection check error:', error);
    } finally {
      setCheckingConnection(false);
    }
  };

  const handleProxyServerChange = (serverKey: string) => {
    setSelectedProxyServer(serverKey);
    const newUrl = PROXY_SERVERS[serverKey as keyof typeof PROXY_SERVERS] || '';
    setServerUrl(newUrl);
  };

  const handleSave = () => {
    if (apiKey.trim()) {
      GPTService.setApiKey(apiKey.trim());
      toast.success('API key saved');
    }
    
    if (serverUrl) {
      GPTService.setServerProxyUrl(serverUrl);
      toast.success('Server URL saved');
    }
    
    GPTService.setResponseStyle(settings.responseStyle);
    toast.success('Settings saved');
    
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
            <h2 className="text-xl font-semibold">Settings</h2>
            <div className="flex">
              <Button variant="ghost" size="icon" onClick={() => setShowQRCodeDialog(true)}>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Share2 size={18} />
                    </TooltipTrigger>
                    <TooltipContent>
                      Share settings
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
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
                    ? "✅ Connection to server successful" 
                    : "❌ Problem connecting to server"}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Server className="h-4 w-4 text-blue-500" />
                  <Label className="text-sm text-foreground/80">
                    Using server proxy (always enabled)
                  </Label>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InfoIcon className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      All requests are routed through a proxy server
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-xs text-muted-foreground">
                All requests are sent through a proxy server to solve CORS issues
              </p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="proxyServer" className="text-sm text-foreground/80">
                Select proxy server
              </Label>
              <Select value={selectedProxyServer} onValueChange={handleProxyServerChange}>
                <SelectTrigger id="proxyServer">
                  <SelectValue placeholder="Select proxy server" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VERCEL">Vercel (recommended)</SelectItem>
                  <SelectItem value="CORS_ANYWHERE">CORS Anywhere</SelectItem>
                  <SelectItem value="ALLORIGINS">All Origins</SelectItem>
                  <SelectItem value="CORSPROXY">CORS Proxy.io</SelectItem>
                  <SelectItem value="THINGPROXY">Thing Proxy</SelectItem>
                  {!isProduction && <SelectItem value="LOCAL">Local server (localhost:3000)</SelectItem>}
                </SelectContent>
              </Select>
              <Input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="Proxy server URL"
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Proxy server URL for bypassing CORS restrictions
              </p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="apiKey" className="text-sm text-foreground/80">
                OpenAI API Key (optional)
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
                API key is used for requests through the proxy; if not provided, the server key is used
              </p>
            </div>

            <Button 
              onClick={checkApiConnection} 
              variant="outline" 
              className="w-full"
              disabled={checkingConnection}
            >
              {checkingConnection ? "Checking..." : "Test Connection"}
            </Button>

            <div className="space-y-3">
              <Label htmlFor="sensitivity" className="text-sm text-foreground/80">
                Microphone sensitivity
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
                <span>Low</span>
                <span>High</span>
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="responseStyle" className="text-sm text-foreground/80">
                Response style
              </Label>
              <Select
                value={settings.responseStyle}
                onValueChange={(value) => onSettingsChange('responseStyle', value)}
              >
                <SelectTrigger id="responseStyle" className="w-full">
                  <SelectValue placeholder="Select style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="autoActivate" className="text-sm text-foreground/80">
                Auto-activate during calls
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
            Save
          </Button>
        </div>
      </motion.div>

      <Dialog open={showQRCodeDialog} onOpenChange={setShowQRCodeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share Settings</DialogTitle>
          </DialogHeader>
          <ApiSettingsQRCode onClose={() => setShowQRCodeDialog(false)} />
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default SettingsPanel;
