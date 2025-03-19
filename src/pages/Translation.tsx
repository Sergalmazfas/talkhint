
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeftRight, Copy, Settings } from 'lucide-react';
import GPTService from '@/services/GPTService';

const Translation = () => {
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [sourceLanguage, setSourceLanguage] = useState('ru');
  const [targetLanguage, setTargetLanguage] = useState('en');

  const handleTranslate = async () => {
    if (!inputText.trim()) {
      toast.error('Введите текст для перевода');
      return;
    }

    if (!GPTService.getApiKey()) {
      toast.error('Пожалуйста, установите API-ключ в настройках');
      return;
    }

    setIsTranslating(true);
    try {
      const response = await GPTService.getTranslation(
        inputText,
        sourceLanguage,
        targetLanguage
      );
      setTranslatedText(response.translation);
      toast.success('Текст успешно переведен');
    } catch (error) {
      console.error('Translation error:', error);
      toast.error('Ошибка при переводе: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'));
      setTranslatedText('');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(translatedText).then(() => {
      toast.success('Перевод скопирован в буфер обмена');
    }).catch(() => {
      toast.error('Не удалось скопировать текст');
    });
  };

  const swapLanguages = () => {
    setSourceLanguage(targetLanguage);
    setTargetLanguage(sourceLanguage);
    setInputText(translatedText);
    setTranslatedText(inputText);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-semibold tracking-tight">Переводчик</h1>
            <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
              Назад
            </Button>
          </div>
          <p className="text-muted-foreground">Переводите тексты с помощью искусственного интеллекта</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="neo-morphism rounded-2xl p-6 mb-8"
        >
          <div className="flex flex-col space-y-4">
            <div className="flex justify-between items-center mb-2">
              <div className="flex space-x-2 items-center">
                <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Исходный язык" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ru">Русский</SelectItem>
                    <SelectItem value="en">Английский</SelectItem>
                    <SelectItem value="fr">Французский</SelectItem>
                    <SelectItem value="de">Немецкий</SelectItem>
                    <SelectItem value="es">Испанский</SelectItem>
                    <SelectItem value="it">Итальянский</SelectItem>
                    <SelectItem value="zh">Китайский</SelectItem>
                    <SelectItem value="ja">Японский</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={swapLanguages}
                  className="rounded-full"
                >
                  <ArrowLeftRight className="h-4 w-4" />
                </Button>
                
                <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Целевой язык" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ru">Русский</SelectItem>
                    <SelectItem value="en">Английский</SelectItem>
                    <SelectItem value="fr">Французский</SelectItem>
                    <SelectItem value="de">Немецкий</SelectItem>
                    <SelectItem value="es">Испанский</SelectItem>
                    <SelectItem value="it">Итальянский</SelectItem>
                    <SelectItem value="zh">Китайский</SelectItem>
                    <SelectItem value="ja">Японский</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Settings className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Настройки перевода</SheetTitle>
                    <SheetDescription>
                      Настройте параметры перевода по вашему предпочтению
                    </SheetDescription>
                  </SheetHeader>
                  <div className="py-4">
                    <p className="text-muted-foreground text-sm">
                      Дополнительные настройки перевода будут добавлены в следующих версиях.
                    </p>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Textarea 
                  placeholder="Введите текст для перевода..." 
                  className="min-h-[200px] resize-none" 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />
                <div className="text-xs text-muted-foreground text-right">
                  {inputText.length} символов
                </div>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Textarea 
                    placeholder="Перевод появится здесь..." 
                    className="min-h-[200px] resize-none" 
                    value={translatedText}
                    readOnly
                  />
                  {translatedText && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm"
                      onClick={handleCopyToClipboard}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="text-xs text-muted-foreground text-right">
                  {translatedText.length} символов
                </div>
              </div>
            </div>

            <Button 
              onClick={handleTranslate} 
              disabled={isTranslating || !inputText.trim()}
              className="w-full mt-2"
            >
              {isTranslating ? 'Переводим...' : 'Перевести'}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Translation;
