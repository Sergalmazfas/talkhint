
import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  isListening: boolean;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isListening }) => {
  if (!isListening) {
    return null;
  }

  return (
    <div className="flex items-center justify-center h-10 gap-1">
      <div className="w-1 h-full bg-primary/80 rounded-full animate-wave-1"></div>
      <div className="w-1 h-full bg-primary/80 rounded-full animate-wave-2"></div>
      <div className="w-1 h-full bg-primary/80 rounded-full animate-wave-3"></div>
      <div className="w-1 h-full bg-primary/80 rounded-full animate-wave-2"></div>
      <div className="w-1 h-full bg-primary/80 rounded-full animate-wave-1"></div>
    </div>
  );
};

export default AudioVisualizer;
