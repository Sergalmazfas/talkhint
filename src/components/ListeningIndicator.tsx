
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AudioVisualizer from './AudioVisualizer';

interface ListeningIndicatorProps {
  isListening: boolean;
  transcribedText: string;
}

const ListeningIndicator: React.FC<ListeningIndicatorProps> = ({ 
  isListening,
  transcribedText
}) => {
  return (
    <AnimatePresence>
      {isListening && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50"
        >
          <div className="glass-morphism rounded-full px-4 py-2 flex items-center space-x-2 shadow-lg">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-primary"></div>
                <div className="absolute inset-0 rounded-full border-2 border-primary animate-pulse-slow"></div>
              </div>
            </div>
            <div className="flex flex-col items-start">
              <span className="text-xs font-medium text-foreground/60">Listening</span>
              {transcribedText && (
                <span className="text-xs text-foreground/80 max-w-48 truncate">{transcribedText}</span>
              )}
            </div>
            <AudioVisualizer isListening={isListening} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ListeningIndicator;
