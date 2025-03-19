import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { PhoneCall } from 'lucide-react';
import ListeningIndicator from '@/components/ListeningIndicator';
import SuggestionsPanel from '@/components/SuggestionsPanel';
import SettingsPanel from '@/components/SettingsPanel';
import GPTService from '@/services/GPTService';
import SpeechService from '@/services/SpeechService';

const Index = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState({
    sensitivity: 50,
    responseStyle: 'casual',
    autoActivate: false, // Changed to false by default
  });
  
  const handleSettingsChange = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    
    if (key === 'sensitivity') {
      SpeechService.setSensitivity(value);
    } else if (key === 'responseStyle') {
      GPTService.setResponseStyle(value);
    }
  };
  
  const toggleListening = () => {
    toast.info('Распознавание голоса доступно на странице звонка');
  };
  
  const handleFinalTranscription = async (text: string) => {
  };
  
  const selectSuggestion = (suggestion: string) => {
    navigator.clipboard.writeText(suggestion).then(() => {
      toast.success('Response copied to clipboard');
      setShowSuggestions(false);
    }).catch(() => {
      toast.error('Failed to copy to clipboard');
    });
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex flex-col">
      <div className="container max-w-md mx-auto px-4 py-8 flex flex-col flex-grow">
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl font-semibold tracking-tight mb-2">TalkHint</h1>
            <p className="text-muted-foreground">Your intelligent conversation assistant</p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col justify-center items-center my-12"
        >
          <Link to="/phonecall" className="w-full max-w-xs">
            <Button 
              variant="default" 
              size="lg"
              className="w-full py-7 text-lg font-medium rounded-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3"
            >
              <div className="bg-white/20 p-3 rounded-full">
                <PhoneCall className="h-7 w-7" />
              </div>
              <span>Начать звонок</span>
            </Button>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="neo-morphism rounded-2xl p-6 mb-8"
        >
          <div className="text-center mb-6">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="22"></line>
              </svg>
            </div>
            <h2 className="text-xl font-medium mb-2">Conversation Assistant</h2>
            <p className="text-sm text-muted-foreground mb-6">
              TalkHint listens to your conversation and suggests intelligent responses
            </p>
          </div>
        </motion.div>
      </div>

      <ListeningIndicator 
        isListening={isListening} 
        transcribedText={transcribedText} 
      />
      
      <SuggestionsPanel 
        suggestions={suggestions} 
        isVisible={showSuggestions} 
        onSelect={selectSuggestion} 
        onDismiss={() => setShowSuggestions(false)} 
      />
      
      <SettingsPanel 
        isOpen={settingsOpen} 
        onClose={() => setSettingsOpen(false)} 
        settings={settings}
        onSettingsChange={handleSettingsChange}
      />
    </div>
  );
};

export default Index;
