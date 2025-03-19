
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
          <div className="glass-morphism rounded-xl px-4 py-3 flex items-center shadow-lg max-w-[90vw] w-auto">
            <div className="flex items-center space-x-3">
              <div className="relative flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                  <div className="absolute inset-0 rounded-full border-2 border-primary animate-pulse-slow"></div>
                </div>
              </div>
              <div className="flex flex-col items-start">
                <span className="text-xs font-medium text-foreground/60">Прослушивание</span>
                <div className="text-sm text-foreground/80 max-w-[70vw] overflow-hidden">
                  {transcribedText ? (
                    <div className="max-h-20 overflow-y-auto">
                      {transcribedText}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs italic">Говорите...</span>
                  )}
                </div>
              </div>
              <div className="ml-2">
                <AudioVisualizer isListening={isListening} />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ListeningIndicator;
