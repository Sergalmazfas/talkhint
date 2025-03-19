
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
