import React from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Bot } from 'lucide-react';
import { useProjectStore } from '../stores/projectStore';

export const AutoclaudeToggle: React.FC = () => {
  const { projects, currentProjectId, toggleAutoclaudePaused } = useProjectStore();
  
  const currentProject = projects.find(p => p.id === currentProjectId);
  const isPaused = currentProject?.autoclaudePaused ?? true;
  const hasRepoUrl = !!currentProject?.repoUrl;

  const handleToggle = async () => {
    if (!currentProjectId || !hasRepoUrl) return;
    await toggleAutoclaudePaused(currentProjectId);
  };

  if (!hasRepoUrl) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg opacity-50">
        <Bot size={16} className="text-white/40" />
        <span className="font-pixel text-xs text-white/40">Configure repo first</span>
      </div>
    );
  }

  return (
    <motion.button
      onClick={handleToggle}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg font-pixel text-sm
        transition-all duration-200
        ${isPaused
          ? 'bg-arcade-green/20 text-arcade-green hover:bg-arcade-green/30 border border-arcade-green/30'
          : 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
        }
      `}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {isPaused ? (
        <>
          <Play size={14} />
          <span>Start</span>
        </>
      ) : (
        <>
          <Pause size={14} />
          <span>Pause</span>
        </>
      )}
    </motion.button>
  );
};
