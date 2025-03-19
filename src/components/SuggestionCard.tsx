
import React from 'react';
import { motion } from 'framer-motion';

interface SuggestionCardProps {
  suggestion: string;
  index: number;
  onSelect: () => void;
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({ suggestion, index, onSelect }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="glass-morphism p-4 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer"
      onClick={onSelect}
    >
      <p className="text-sm text-foreground">{suggestion}</p>
    </motion.div>
  );
};

export default SuggestionCard;
