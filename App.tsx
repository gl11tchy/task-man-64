import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Layout } from './components/Layout';
import { ModeToggle } from './components/ModeToggle';
import { TaskInput } from './components/TaskInput';
import { FocusView } from './components/FocusView';
import { ListView } from './components/ListView';
import { Task, AppMode } from './types';
import { useAudio } from './hooks/useAudio';
import { Volume2, VolumeX, Star } from 'lucide-react';
import { supabase } from './supabase';

const STORAGE_KEY = 'workstation_score';

export default function App() {
  // State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [mode, setMode] = useState<AppMode>(AppMode.AUTO);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<'active' | 'completed'>('active');
  const [score, setScore] = useState(0);
  const [muted, setMuted] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Audio Hook
  const { playSound } = useAudio(muted);

  // Load from Supabase
  useEffect(() => {
    const loadData = async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to load tasks:', error);
      } else if (data) {
        setTasks(data);
      }

      const savedScore = localStorage.getItem(STORAGE_KEY);
      if (savedScore) {
        setScore(parseInt(savedScore, 10));
      }

      setIsInitialized(true);
    };

    loadData();
  }, []);

  // Save score to localStorage (keep score local for now)
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(STORAGE_KEY, score.toString());
    }
  }, [score, isInitialized]);

  // Derived Lists
  // For Active tasks: Keep original ordering (Reorderable)
  // For Completed tasks: Sort by completion time (Newest first)
  const activeTasks = tasks.filter(t => t.status === 'todo');
  const completedTasks = tasks
    .filter(t => t.status === 'completed')
    .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));

  // Task Management
  const addTask = async (text: string) => {
    const newTask: Task = {
      id: uuidv4(),
      text,
      status: 'todo',
      createdAt: Date.now(),
    };

    const { error } = await supabase
      .from('tasks')
      .insert([newTask]);

    if (error) {
      console.error('Failed to add task:', error);
      return;
    }

    setTasks(prev => [newTask, ...prev]);
    setCurrentTab('active');
    playSound('click');
  };

  const completeTask = async () => {
    let taskToCompleteId = selectedTaskId;

    // In Auto mode, default to the top active task if none selected
    if (mode === AppMode.AUTO && !taskToCompleteId) {
        if (activeTasks.length > 0) {
            taskToCompleteId = activeTasks[0].id;
        }
    }

    if (!taskToCompleteId) return;

    const completedAt = Date.now();
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'completed', completedAt })
      .eq('id', taskToCompleteId);

    if (error) {
      console.error('Failed to complete task:', error);
      return;
    }

    setTasks(prev => prev.map(t =>
        t.id === taskToCompleteId
        ? { ...t, status: 'completed', completedAt }
        : t
    ));

    setScore(prev => prev + 100);
    setSelectedTaskId(null);
    playSound('success');
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete task:', error);
      return;
    }

    setTasks(prev => prev.filter(t => t.id !== id));
    if (selectedTaskId === id) setSelectedTaskId(null);
    playSound('delete');
  };

  const restoreTask = async (id: string) => {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'todo', completedAt: null })
        .eq('id', id);

      if (error) {
        console.error('Failed to restore task:', error);
        return;
      }

      setTasks(prev => prev.map(t =>
        t.id === id ? { ...t, status: 'todo', completedAt: undefined } : t
      ));
      setCurrentTab('active');
      playSound('click');
  };

  const handleReorder = (reorderedActiveTasks: Task[]) => {
      // We need to merge the reordered active tasks back with the completed tasks
      // Preserving the set structure
      const currentCompleted = tasks.filter(t => t.status === 'completed');
      setTasks([...reorderedActiveTasks, ...currentCompleted]);
  };

  const handleModeToggle = (newMode: AppMode) => {
    setMode(newMode);
    setSelectedTaskId(null);
    playSound('switch');
  };

  // Logic to determine what to show
  // In Auto mode: If we have active tasks, we default to showing FocusView for the top one
  // UNLESS the user explicitly navigates "back" (which we don't really support in pure auto mode, but we can relax it)
  
  // Revised Logic based on User Request:
  // "Click on it -> Big Mission Screen" implies Manual selection is primary.
  // Auto mode just removes the selection step.
  
  const activeTask = mode === AppMode.AUTO 
    ? activeTasks[0] 
    : activeTasks.find(t => t.id === selectedTaskId);

  const showFocusView = !!activeTask && (mode === AppMode.AUTO || !!selectedTaskId);

  return (
    <Layout>
      {/* Header / Status Bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-black/20 border-b border-white/5 backdrop-blur-sm shrink-0">
        <ModeToggle mode={mode} onToggle={handleModeToggle} />
        
        <div className="flex items-center gap-6">
           {/* Score Display */}
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
             onClick={() => {
                setMuted(!muted);
                // playSound is not available if muted just changed to true, logic handled in hook
             }} 
             className="text-white/30 hover:text-white transition-colors"
           >
             {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
           </button>
        </div>
      </div>

      {/* Main Content Area */}
      {showFocusView ? (
        <FocusView 
          task={activeTask} 
          onComplete={completeTask} 
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
              playSound('tab'); // You might need to add 'tab' to SoundType or map to 'click'
          }}
          onReorder={handleReorder} 
          onSelect={(id) => {
            setSelectedTaskId(id);
            playSound('click');
          }}
          onDelete={deleteTask}
          onRestore={restoreTask}
        />
      )}

      {/* Input only shows if we are NOT in focus view (unless allow adding while focusing?) 
          User asked: "Type tasks -> list". 
          Usually better to always allow capture.
      */}
      <TaskInput 
        onAdd={addTask} 
        disabled={showFocusView && mode === AppMode.AUTO} // Disable input only if locked in Auto focus
      />

    </Layout>
  );
}