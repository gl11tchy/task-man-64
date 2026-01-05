import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Volume2, VolumeX, Star, Menu } from 'lucide-react';
import { ModeToggle } from './ModeToggle';
import { TaskInput } from './TaskInput';
import { FocusView } from './FocusView';
import { ListView } from './ListView';
import { UserMenu } from './UserMenu';
import { AppMode, Task } from '../types';
import { useAudio } from '../hooks/useAudio';
import { useProjectStore } from '../stores/projectStore';
import { useUIStore } from '../stores/uiStore';
import { TaskEditModal } from './TaskEditModal';

export const WorkstationView: React.FC = () => {
  const { mode, setMode, muted, toggleMuted, setSidebarMobileOpen, score, addScore } = useUIStore();
  const {
    tasks,
    currentProjectId,
    addTask,
    updateTask,
    deleteTask,
    completeTask,
    restoreTask,
    reorderTasks,
  } = useProjectStore();

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<'active' | 'completed'>('active');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const { playSound } = useAudio(muted);

  // Filter tasks for current project
  const projectTasks = tasks.filter(t => t.projectId === currentProjectId);

  // Active tasks: not completed, not in backlog, on the kanban board or no column assignment
  const activeTasks = projectTasks.filter(t =>
    t.status === 'todo' && !t.isInBacklog
  );

  // Completed tasks sorted by completion time
  const completedTasks = projectTasks
    .filter(t => t.status === 'completed')
    .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));

  const handleAddTask = async (text: string) => {
    await addTask(text, false); // Add to kanban, not backlog
    setCurrentTab('active');
    playSound('click');
  };

  const handleCompleteTask = async () => {
    let taskToCompleteId = selectedTaskId;

    if (mode === AppMode.AUTO && !taskToCompleteId) {
      if (activeTasks.length > 0) {
        taskToCompleteId = activeTasks[0].id;
      }
    }

    if (!taskToCompleteId) return;

    await completeTask(taskToCompleteId);
    addScore(100);
    setSelectedTaskId(null);
    playSound('success');
  };

  const handleDeleteTask = async (id: string) => {
    await deleteTask(id);
    if (selectedTaskId === id) setSelectedTaskId(null);
    playSound('delete');
  };

  const handleRestoreTask = async (id: string) => {
    await restoreTask(id);
    setCurrentTab('active');
    playSound('click');
  };

  const handleReorder = (reorderedActiveTasks: Task[]) => {
    reorderTasks(reorderedActiveTasks);
  };

  const handleEditTask = (id: string) => {
    setEditingTaskId(id);
    playSound('click');
  };

  const handleSaveEdit = async (taskId: string, text: string) => {
    await updateTask(taskId, { text });
    playSound('click');
  };

  const editingTask = editingTaskId ? tasks.find(t => t.id === editingTaskId) : null;

  const handleModeToggle = (newMode: AppMode) => {
    setMode(newMode);
    setSelectedTaskId(null);
    playSound('switch');
  };

  // Logic to determine what to show
  const activeTask = mode === AppMode.AUTO
    ? activeTasks[0]
    : activeTasks.find(t => t.id === selectedTaskId);

  const showFocusView = !!activeTask && (mode === AppMode.AUTO || !!selectedTaskId);

  return (
    <>
      {/* Header / Status Bar */}
      <div className="flex items-center justify-between px-4 md:px-6 py-4 bg-black/20 border-b border-white/5 backdrop-blur-sm shrink-0">
        {/* Mobile menu button */}
        <button
          onClick={() => setSidebarMobileOpen(true)}
          className="md:hidden p-2 -ml-2 text-white/60 hover:text-white"
        >
          <Menu size={20} />
        </button>

        <ModeToggle mode={mode} onToggle={handleModeToggle} />

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-lg border border-white/10">
            <Star size={14} className="text-arcade-yellow fill-arcade-yellow animate-pulse" />
            <div className="flex flex-col items-end">
              <span className="text-[8px] text-white/50 font-game leading-none mb-1">SCORE</span>
              <span className="text-xl font-pixel text-arcade-yellow leading-none drop-shadow-neon-yellow">
                {String(score).padStart(6, '0')}
              </span>
            </div>
          </div>

          <button
            onClick={toggleMuted}
            className="text-white/30 hover:text-white transition-colors"
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          <UserMenu />
        </div>
      </div>

      {/* Main Content Area */}
      {showFocusView ? (
        <FocusView
          task={activeTask}
          onComplete={handleCompleteTask}
          onBack={mode === AppMode.MANUAL ? () => setSelectedTaskId(null) : undefined}
          showBackButton={mode === AppMode.MANUAL}
        />
      ) : (
        <ListView
          activeTasks={activeTasks}
          completedTasks={completedTasks}
          currentTab={currentTab}
          onTabChange={(t) => {
            setCurrentTab(t);
            playSound('tab');
          }}
          onReorder={handleReorder}
          onSelect={(id) => {
            setSelectedTaskId(id);
            playSound('click');
          }}
          onDelete={handleDeleteTask}
          onRestore={handleRestoreTask}
          onEdit={handleEditTask}
        />
      )}

      {/* Task Input */}
      <TaskInput
        onAdd={handleAddTask}
        disabled={showFocusView && mode === AppMode.AUTO}
      />

      <TaskEditModal
        isOpen={!!editingTaskId}
        task={editingTask || null}
        onClose={() => setEditingTaskId(null)}
        onSave={handleSaveEdit}
      />
    </>
  );
};
