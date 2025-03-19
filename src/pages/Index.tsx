
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import ListeningIndicator from '@/components/ListeningIndicator';
import SuggestionsPanel from '@/components/SuggestionsPanel';
import SettingsPanel from '@/components/SettingsPanel';
import SpeechService from '@/services/SpeechService';
import GPTService from '@/services/GPTService';

const Index = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState({
    sensitivity: 50,
    responseStyle: 'casual',
    autoActivate: true,
  });
  
  const handleSettingsChange = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    
    if (key === 'sensitivity') {
      SpeechService.setSensitivity(value);
    } else if (key === 'responseStyle') {
      GPTService.setResponseStyle(value);
    }
  };
  
  // Function still exists but is no longer linked to a button
  const toggleListening = () => {
    if (!SpeechService.isAvailable()) {
      toast.error('Speech recognition is not supported in your browser');
      return;
    }
    
    if (isListening) {
      SpeechService.stopListening();
      setIsListening(false);
      setShowSuggestions(false);
      toast.info('Stopped listening');
    } else {
      SpeechService.startListening(
        (text) => setTranscribedText(text),
        handleFinalTranscription
      );
      setIsListening(true);
      toast.success('Started listening to your conversation');
    }
  };
  
  const handleFinalTranscription = async (text: string) => {
    if (text.trim().length > 5) {
      const response = await GPTService.getSuggestions(text);
      setSuggestions(response.suggestions);
      setShowSuggestions(true);
    }
  };
  
  const selectSuggestion = (suggestion: string) => {
    navigator.clipboard.writeText(suggestion).then(() => {
      toast.success('Response copied to clipboard');
      setShowSuggestions(false);
    }).catch(() => {
      toast.error('Failed to copy to clipboard');
    });
  };
  
  // Auto-start listening when component mounts if autoActivate is enabled
  useEffect(() => {
    if (settings.autoActivate && !isListening) {
      setTimeout(() => {
        toggleListening();
      }, 1000);
    }
  }, [settings.autoActivate]);
  
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
          console.log('Microphone permission granted');
        })
        .catch((err) => {
          console.error('Microphone permission denied:', err);
          toast.error('Please allow microphone access to use this app');
        });
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <div className="container max-w-md mx-auto px-4 py-8">
        <div className="text-center mb-12">
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
          
          <div className="space-y-4 text-sm">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              </div>
              <div>
                <p className="text-foreground">TalkHint listens to your conversation and suggests intelligent responses</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <div>
                <p className="text-foreground">Your conversations are processed locally for privacy</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                </svg>
              </div>
              <div>
                <p className="text-foreground">Quickly copy the suggested responses to use them</p>
              </div>
            </div>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex justify-center"
        >
          <Link to="/phonecall">
            <Button 
              variant="outline" 
              className="rounded-full px-6"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
              Звонок
            </Button>
          </Link>
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
