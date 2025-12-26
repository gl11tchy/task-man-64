import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Bot, Loader2, Circle } from 'lucide-react';
import { useProjectStore } from '../stores/projectStore';
import { isAutoclaudePaused } from '../types';

// Check if daemon has been active recently (within last 2 minutes)
const DAEMON_ACTIVE_THRESHOLD_MS = 120000;

export const AutoclaudeToggle: React.FC = () => {
  const { projects, currentProjectId, toggleAutoclaudePaused, autoclaudeEvents } = useProjectStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const currentProject = projects.find(p => p.id === currentProjectId);
  const isPaused = isAutoclaudePaused(currentProject);
  const hasRepoUrl = !!currentProject?.repoUrl;
  
  // Check if daemon is active based on recent events
  const latestEvent = autoclaudeEvents[0];
  const isDaemonActive = latestEvent && 
    (Date.now() - latestEvent.createdAt) < DAEMON_ACTIVE_THRESHOLD_MS;

  const handleToggle = async () => {
    if (!currentProjectId || !hasRepoUrl || isLoading) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await toggleAutoclaudePaused(currentProjectId);
    } catch (err) {
      setError('Failed to update. Try again.');
      console.error('Toggle failed:', err);
    } finally {
      setIsLoading(false);
    }
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
    <div className="flex flex-col items-end gap-1">
      <motion.button
        onClick={handleToggle}
        disabled={isLoading}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg font-pixel text-sm
          transition-all duration-200
          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
          ${isPaused
            ? 'bg-arcade-green/20 text-arcade-green hover:bg-arcade-green/30 border border-arcade-green/30'
            : 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
          }
        `}
        whileHover={isLoading ? {} : { scale: 1.02 }}
        whileTap={isLoading ? {} : { scale: 0.98 }}
      >
        {isLoading ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            <span>...</span>
          </>
        ) : isPaused ? (
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
      {error && (
        <span className="font-pixel text-[10px] text-red-400">{error}</span>
      )}
      {!isPaused && (
        <div className="flex items-center gap-1.5">
          <Circle 
            size={6} 
            className={isDaemonActive ? 'fill-arcade-green text-arcade-green' : 'fill-amber-400 text-amber-400'} 
          />
          <span className={`font-pixel text-[10px] ${isDaemonActive ? 'text-white/40' : 'text-amber-400'}`}>
            {isDaemonActive ? 'Daemon connected' : 'Waiting for daemon...'}
          </span>
        </div>
      )}
    </div>
  );
};
