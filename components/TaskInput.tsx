import React, { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';

interface TaskInputProps {
  onAdd: (text: string) => void;
  disabled?: boolean;
}

export const TaskInput: React.FC<TaskInputProps> = ({ onAdd, disabled }) => {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onAdd(text.trim());
      setText('');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        // Don't steal focus if user is typing in another input, textarea, or contenteditable element
        const activeEl = document.activeElement;
        const isTypingElsewhere = activeEl instanceof HTMLInputElement ||
                                   activeEl instanceof HTMLTextAreaElement ||
                                   activeEl?.getAttribute('contenteditable') === 'true';

        if (!disabled && !isTypingElsewhere && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            inputRef.current?.focus();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled]);

  return (
    <form onSubmit={handleSubmit} className="w-full relative mt-auto p-4 bg-black/20 border-t-2 border-white/5">
      <div className="flex items-center gap-3 relative">
        
        {/* Animated Chevron */}
        <motion.div 
            animate={{ x: [0, 5, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="text-arcade-pink font-game text-xl"
        >
            {'>'}
        </motion.div>

        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={disabled ? "MISSION IN PROGRESS..." : "INSERT NEW MISSION..."}
          disabled={disabled}
          className="w-full bg-transparent border-none outline-none text-white font-pixel text-3xl placeholder-white/20 disabled:opacity-50"
          autoFocus
        />
        
        <motion.button 
            type="submit"
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            disabled={!text.trim() || disabled}
            className="w-10 h-10 flex items-center justify-center bg-arcade-pink rounded-lg text-white shadow-neon-pink disabled:opacity-20 disabled:shadow-none"
        >
            <Plus size={24} strokeWidth={4} />
        </motion.button>
      </div>
    </form>
  );
};