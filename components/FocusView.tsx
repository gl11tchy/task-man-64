import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task } from '../types';
import { Zap, Trophy } from 'lucide-react';

interface FocusViewProps {
  task: Task;
  onComplete: () => void;
  onBack?: () => void;
  showBackButton?: boolean;
}

export const FocusView: React.FC<FocusViewProps> = ({ task, onComplete, onBack, showBackButton }) => {
  const [particles, setParticles] = useState<{id: number, x: number, y: number}[]>([]);

  const handleComplete = (e: React.MouseEvent) => {
    // Spawn particles logic just for visual flair before unmount
    const newParticles = Array.from({ length: 12 }).map((_, i) => ({
        id: Date.now() + i,
        x: (Math.random() - 0.5) * 200,
        y: (Math.random() - 0.5) * 200
    }));
    setParticles(newParticles);
    
    // Slight delay to show animation
    setTimeout(onComplete, 150);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden bg-[radial-gradient(circle_at_center,#2e2c5e_0%,#0f102a_80%)]">
      
      {showBackButton && (
        <button 
          onClick={onBack}
          className="absolute top-4 left-4 font-game text-[10px] text-white/50 hover:text-arcade-cyan transition-colors"
        >
          {'< BACK'}
        </button>
      )}

      {/* Decorative Floating Shapes */}
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute top-10 right-10 w-20 h-20 border-2 border-dashed border-white/10 rounded-full pointer-events-none"
      />
      <motion.div 
        animate={{ rotate: -360 }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-20 left-10 w-16 h-16 border-4 border-white/5 rotate-45 pointer-events-none"
      />

      <motion.div
        initial={{ scale: 0.5, opacity: 0, rotateX: -90 }}
        animate={{ scale: 1, opacity: 1, rotateX: 0 }}
        transition={{ type: "spring", bounce: 0.5 }}
        className="w-full max-w-2xl text-center z-10"
      >
        <div className="inline-block px-3 py-1 mb-6 rounded-full bg-white/10 border border-white/20">
             <span className="font-game text-[10px] text-arcade-yellow tracking-widest flex items-center gap-2">
                <Zap size={10} fill="currentColor" /> CURRENT TARGET
             </span>
        </div>
        
        <motion.h2 
            className="text-5xl md:text-7xl font-pixel text-white leading-[0.9] mb-12 drop-shadow-[4px_4px_0px_#ff00ff]"
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        >
          {task.text}
        </motion.h2>

        <motion.button
          whileHover={{ scale: 1.1, boxShadow: "0 0 30px #00ffff" }}
          whileTap={{ scale: 0.9 }}
          onClick={handleComplete}
          className="relative group bg-arcade-cyan text-black font-game text-sm px-10 py-6 rounded-xl border-b-8 border-[#009999] active:border-b-0 active:translate-y-2 transition-all"
        >
          <span className="flex items-center gap-3">
            <Trophy size={20} />
            COMPLETE MISSION
          </span>
          
          {/* Shine effect */}
          <div className="absolute top-0 left-0 w-full h-1/2 bg-white/30 rounded-t-lg pointer-events-none"></div>
        </motion.button>
        
        {/* Particle System for click */}
        <AnimatePresence>
            {particles.map(p => (
                <motion.div
                    key={p.id}
                    initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                    animate={{ x: p.x, y: p.y, scale: 0, opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="absolute left-1/2 top-1/2 w-4 h-4 bg-arcade-yellow rounded-sm pointer-events-none"
                    style={{ marginLeft: -8, marginTop: -8 }}
                />
            ))}
        </AnimatePresence>

      </motion.div>
    </div>
  );
};