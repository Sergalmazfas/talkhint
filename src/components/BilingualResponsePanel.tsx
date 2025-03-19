
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BilingualResponseCard from './BilingualResponseCard';

interface BilingualResponsePanelProps {
  responses: Array<{english: string, russian: string}>;
  isVisible: boolean;
  onSelect: (response: {english: string, russian: string}) => void;
  onDismiss: () => void;
}

const BilingualResponsePanel: React.FC<BilingualResponsePanelProps> = ({ 
  responses, 
  isVisible, 
  onSelect, 
  onDismiss 
}) => {
  if (!isVisible || responses.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -100 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed top-16 left-4 right-4 z-40"
      >
        <div className="glass-morphism rounded-3xl p-4 shadow-lg">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium text-foreground/80">Варианты ответов</h3>
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
            {responses.map((response, index) => (
              <BilingualResponseCard
                key={index}
                response={response}
                index={index}
                onSelect={() => onSelect(response)}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BilingualResponsePanel;
