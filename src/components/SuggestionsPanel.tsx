
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SuggestionCard from './SuggestionCard';

interface SuggestionsPanelProps {
  suggestions: string[];
  isVisible: boolean;
  onSelect: (suggestion: string) => void;
  onDismiss: () => void;
}

const SuggestionsPanel: React.FC<SuggestionsPanelProps> = ({ 
  suggestions, 
  isVisible, 
  onSelect, 
  onDismiss 
}) => {
  if (!isVisible || suggestions.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed bottom-6 left-4 right-4 z-50"
      >
        <div className="glass-morphism rounded-3xl p-4 shadow-lg">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium text-foreground/80">Suggested responses</h3>
            <button 
              onClick={onDismiss}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <SuggestionCard
                key={index}
                suggestion={suggestion}
                index={index}
                onSelect={() => onSelect(suggestion)}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SuggestionsPanel;
