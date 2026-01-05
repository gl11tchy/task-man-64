import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Portal } from './Portal';
import { Task } from '../types';

interface TaskEditModalProps {
  isOpen: boolean;
  task: Task | null;
  onClose: () => void;
  onSave: (taskId: string, text: string) => void;
}

export const TaskEditModal: React.FC<TaskEditModalProps> = ({ isOpen, task, onClose, onSave }) => {
  const [text, setText] = useState('');

  useEffect(() => {
    if (task) {
      setText(task.text);
    }
  }, [task]);

  if (!isOpen || !task) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && text.trim() !== task.text) {
      // Parent handles closing on success
      onSave(task.id, text.trim());
    } else {
      // No changes, just close
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <Portal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md bg-arcade-panel/95 backdrop-blur-md rounded-2xl p-6 shadow-[0_0_50px_rgba(157,0,255,0.4)] border-4 border-[#ffffff20] ring-4 ring-arcade-purple"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-pixel text-arcade-cyan drop-shadow-neon-cyan mb-2">
              EDIT MISSION
            </h2>
            <p className="text-sm text-white/60 font-game">
              Update your task details
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-game text-white/70 mb-2 uppercase tracking-wider">
                Task
              </label>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                required
                autoFocus
                className="w-full px-4 py-3 bg-black/40 border-2 border-white/10 rounded-lg text-white placeholder-white/30 focus:border-arcade-cyan focus:outline-none focus:shadow-neon-cyan transition-all font-pixel text-lg"
                placeholder="What needs to be done?"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-6 bg-black/40 text-white/60 hover:text-white font-pixel text-lg rounded-lg transition-all"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={!text.trim()}
                className="flex-1 py-3 px-6 bg-arcade-pink hover:bg-arcade-pink/80 disabled:bg-gray-500/50 text-white font-pixel text-lg rounded-lg shadow-neon-pink hover:shadow-neon-pink-strong transition-all disabled:cursor-not-allowed"
              >
                SAVE
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </Portal>
  );
};
