
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Mic, MicOff, PhoneCall as PhoneIcon, MessageCircle, ArrowLeft, Phone, Globe } from 'lucide-react';
import ListeningIndicator from '@/components/ListeningIndicator';
import BilingualResponsePanel from '@/components/BilingualResponsePanel';
import SpeechService from '@/services/SpeechService';
import GPTService from '@/services/GPTService';

const PhoneCall = () => {
  const [isListening, setIsListening] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [bilingualResponses, setBilingualResponses] = useState<Array<{english: string, russian: string}>>([]);
  const [showBilingualResponses, setShowBilingualResponses] = useState(false);
  const [recognitionLanguage, setRecognitionLanguage] = useState('ru-RU');
  
  const languageOptions = [
    { code: 'ru-RU', name: 'Русский' },
    { code: 'en-US', name: 'English' }
  ];
  
  const toggleCall = () => {
    if (isCallActive) {
      // End call
      if (isListening) {
        toggleListening();
      }
      setIsCallActive(false);
      toast.info('Звонок завершен');
      setShowBilingualResponses(false);
    } else {
      // Start call
      setIsCallActive(true);
      toast.success('Звонок начат');
      // Auto-start listening when call begins
      if (!isListening) {
        toggleListening();
      }
    }
  };
  
  const toggleListening = () => {
    if (!SpeechService.isAvailable()) {
      toast.error('Распознавание речи не поддерживается в вашем браузере');
      return;
    }
    
    if (isListening) {
      SpeechService.stopListening();
      setIsListening(false);
      toast.info('Микрофон выключен');
    } else {
      // Set the language first
      SpeechService.setLanguage(recognitionLanguage);
      SpeechService.startListening(
        (text) => setTranscribedText(text),
        handleFinalTranscription
      );
      setIsListening(true);
      toast.success('Микрофон включен');
    }
  };
  
  const handleFinalTranscription = async (text: string) => {
    if (text.trim().length > 5) {
      try {
        // Generate bilingual responses (English and Russian)
        const bilingualResult = await GPTService.getBilingualResponses(text);
        setBilingualResponses(bilingualResult.responses);
        setShowBilingualResponses(true);
      } catch (error) {
        console.error('Error getting responses:', error);
        toast.error('Не удалось получить ответы');
      }
    }
  };
  
  const selectBilingualResponse = (response: {english: string, russian: string}) => {
    navigator.clipboard.writeText(response.russian).then(() => {
      toast.success('Ответ скопирован в буфер обмена');
    }).catch(() => {
      toast.error('Не удалось скопировать в буфер обмена');
    });
  };
  
  const changeLanguage = (languageCode: string) => {
    setRecognitionLanguage(languageCode);
    SpeechService.setLanguage(languageCode);
    toast.success(`Язык распознавания изменен на ${languageOptions.find(l => l.code === languageCode)?.name}`);
    
    // Restart speech recognition if it's already active
    if (isListening) {
      SpeechService.stopListening();
      setTimeout(() => {
        SpeechService.startListening(
          (text) => setTranscribedText(text),
          handleFinalTranscription
        );
      }, 300);
    }
  };
  
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
          console.log('Доступ к микрофону получен');
        })
        .catch((err) => {
          console.error('Доступ к микрофону запрещен:', err);
          toast.error('Пожалуйста, разрешите доступ к микрофону для использования приложения');
        });
    }
    
    // Clean up on unmount
    return () => {
      if (isListening) {
        SpeechService.stopListening();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <div className="container max-w-md mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Link to="/" className="text-primary hover:text-primary/80 transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-2xl font-semibold ml-4">Телефонный разговор</h1>
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
                <>
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
                  
                  <div className="flex justify-between items-center rounded-lg border p-3 bg-background/50">
                    <div className="flex items-center">
                      <Globe size={16} className="text-primary mr-2" />
                      <span className="text-sm">Язык распознавания:</span>
                    </div>
                    <div className="flex space-x-2">
                      {languageOptions.map((lang) => (
                        <Button
                          key={lang.code}
                          variant="ghost"
                          size="sm"
                          onClick={() => changeLanguage(lang.code)}
                          className={recognitionLanguage === lang.code ? 'bg-primary/20' : ''}
                        >
                          {lang.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
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

        <div className="text-center text-sm text-muted-foreground">
          <p>Поставьте телефон на громкую связь и получайте<br />умные подсказки для ответа в реальном времени</p>
        </div>
      </div>

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
