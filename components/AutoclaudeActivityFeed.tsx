import React, { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitBranch,
  GitPullRequest,
  Bot,
  CheckCircle,
  XCircle,
  Loader2,
  MessageSquare,
  RefreshCw,
  Rocket,
} from 'lucide-react';
import { useProjectStore } from '../stores/projectStore';
import { AutoclaudeEvent, AutoclaudeEventType } from '../types';

const EVENT_ICONS: Record<AutoclaudeEventType, React.ReactNode> = {
  task_started: <Rocket size={14} className="text-arcade-cyan" />,
  cloning_repo: <RefreshCw size={14} className="text-blue-400 animate-spin" />,
  creating_branch: <GitBranch size={14} className="text-purple-400" />,
  running_claude: <Bot size={14} className="text-arcade-cyan animate-pulse" />,
  committing: <RefreshCw size={14} className="text-yellow-400" />,
  creating_pr: <GitPullRequest size={14} className="text-arcade-green" />,
  task_completed: <CheckCircle size={14} className="text-arcade-green" />,
  task_failed: <XCircle size={14} className="text-red-400" />,
  feedback_started: <MessageSquare size={14} className="text-arcade-cyan" />,
  feedback_completed: <CheckCircle size={14} className="text-arcade-green" />,
};

const EventItem: React.FC<{ event: AutoclaudeEvent }> = ({ event }) => {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString();
  };

  const isActiveStep = ['cloning_repo', 'creating_branch', 'running_claude', 'committing', 'creating_pr'].includes(event.eventType);
  const isError = event.eventType === 'task_failed';
  const isSuccess = ['task_completed', 'feedback_completed'].includes(event.eventType);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`
        flex items-start gap-3 px-3 py-2 rounded-lg
        ${isActiveStep ? 'bg-arcade-cyan/5 border border-arcade-cyan/20' : 'bg-white/5'}
        ${isError ? 'bg-red-500/5 border border-red-500/20' : ''}
        ${isSuccess ? 'bg-arcade-green/5 border border-arcade-green/20' : ''}
      `}
    >
      <div className="mt-0.5 shrink-0">
        {EVENT_ICONS[event.eventType]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-pixel text-xs text-white truncate">
          {event.message}
        </p>
        <p className="font-pixel text-[10px] text-white/30 mt-0.5">
          {formatTime(event.createdAt)}
        </p>
      </div>
    </motion.div>
  );
};

export const AutoclaudeActivityFeed: React.FC = () => {
  const { autoclaudeEvents, loadAutoclaudeEvents, isLoadingEvents, currentProjectId, projects } = useProjectStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const currentProject = projects.find(p => p.id === currentProjectId);
  const isPaused = currentProject?.autoclaudePaused ?? true;

  // Stable reference to avoid effect re-running on every render
  const loadEventsRef = useRef(loadAutoclaudeEvents);
  loadEventsRef.current = loadAutoclaudeEvents;

  // Poll for new events every 3 seconds when not paused
  useEffect(() => {
    // Always clear any existing interval first to prevent leaks
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!currentProjectId) return;

    // Initial load
    loadEventsRef.current();

    // Set up polling only when not paused
    if (!isPaused) {
      intervalRef.current = setInterval(() => {
        loadEventsRef.current();
      }, 3000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [currentProjectId, isPaused]);

  if (isLoadingEvents && autoclaudeEvents.length === 0) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 size={20} className="text-arcade-cyan animate-spin" />
      </div>
    );
  }

  if (autoclaudeEvents.length === 0) {
    return (
      <div className="py-4 text-center">
        <Bot size={20} className="mx-auto text-white/20 mb-2" />
        <p className="font-pixel text-xs text-white/30">No activity yet</p>
        <p className="font-pixel text-[10px] text-white/20 mt-1">
          Activity will appear here when processing starts
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 max-h-48 overflow-y-auto">
      <AnimatePresence mode="popLayout">
        {autoclaudeEvents.slice(0, 15).map((event) => (
          <EventItem key={event.id} event={event} />
        ))}
      </AnimatePresence>
    </div>
  );
};
