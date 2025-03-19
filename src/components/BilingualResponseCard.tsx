
import React from 'react';
import { motion } from 'framer-motion';

interface BilingualResponseCardProps {
  response: {english: string, russian: string};
  index: number;
  onSelect: () => void;
}

const BilingualResponseCard: React.FC<BilingualResponseCardProps> = ({ response, index, onSelect }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="glass-morphism p-4 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer"
      onClick={onSelect}
    >
      <div className="space-y-3">
        <div className="flex items-center">
          <span className="flex items-center justify-center w-6 h-6 bg-primary/10 rounded-full text-xs font-semibold text-primary mr-2">
            {index + 1}
          </span>
          <p className="text-sm font-medium text-foreground">{response.english}</p>
        </div>
        <p className="text-sm italic text-muted-foreground pl-8">{response.russian}</p>
      </div>
    </motion.div>
  );
};

export default BilingualResponseCard;
