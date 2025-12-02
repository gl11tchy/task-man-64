import React from 'react';
import { motion } from 'framer-motion';
import { AppMode } from '../types';

interface ModeToggleProps {
  mode: AppMode;
  onToggle: (mode: AppMode) => void;
}

export const ModeToggle: React.FC<ModeToggleProps> = ({ mode, onToggle }) => {
  const isAuto = mode === AppMode.AUTO;

  return (
    <div className="flex items-center gap-3 select-none">
        
      {/* Label Left */}
      <span 
        className={`font-game text-[10px] transition-colors ${isAuto ? 'text-arcade-cyan drop-shadow-neon-cyan' : 'text-white/30'}`}
      >
        AUTO
      </span>

      <div 
        className="relative w-20 h-8 bg-black/50 rounded-full border-2 border-white/10 p-1 cursor-pointer shadow-inner"
        onClick={() => onToggle(isAuto ? AppMode.MANUAL : AppMode.AUTO)}
      >
        {/* Sliding Button */}
        <motion.div
          layout
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
          className={`w-8 h-full rounded-full shadow-lg flex items-center justify-center border-2 border-white/50
             ${isAuto ? 'bg-arcade-cyan shadow-neon-cyan' : 'bg-arcade-yellow shadow-neon-yellow ml-auto'}
          `}
        >
          <div className="w-2 h-2 bg-white rounded-full opacity-80"></div>
        </motion.div>
      </div>

      {/* Label Right */}
      <span 
        className={`font-game text-[10px] transition-colors ${!isAuto ? 'text-arcade-yellow drop-shadow-neon-yellow' : 'text-white/30'}`}
      >
        MANUAL
      </span>

    </div>
  );
};