import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Layout } from './components/Layout';
import { ModeToggle } from './components/ModeToggle';
import { TaskInput } from './components/TaskInput';
import { FocusView } from './components/FocusView';
import { ListView } from './components/ListView';
import { UserMenu } from './components/UserMenu';
import { Task, AppMode } from './types';
import { useAudio } from './hooks/useAudio';
import { useAuth } from './contexts/AuthContext';
import { TaskStorage } from './services/taskStorage';
import { Volume2, VolumeX, Star } from 'lucide-react';

const STORAGE_KEY = 'workstation_score';

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const storageRef = useRef(new TaskStorage());

  const [tasks, setTasks] = useState<Task[]>([]);
  const [mode, setMode] = useState<AppMode>(AppMode.AUTO);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<'active' | 'completed'>('active');
  const [score, setScore] = useState(0);
  const [muted, setMuted] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [migrationDone, setMigrationDone] = useState(false);

  const { playSound } = useAudio(muted);

  useEffect(() => {
    storageRef.current.setUserId(user?.id || null);
  }, [user]);

  useEffect(() => {
    const loadData = async () => {
      if (authLoading) return;

      const loadedTasks = await storageRef.current.loadTasks();
      setTasks(loadedTasks);

      const savedScore = localStorage.getItem(STORAGE_KEY);
      if (savedScore) {
        setScore(parseInt(savedScore, 10));
      }

      setIsInitialized(true);
    };

    loadData();
  }, [authLoading, user]);

  useEffect(() => {
    const migrateData = async () => {
      if (!user || migrationDone || !isInitialized) return;

      const result = await storageRef.current.migrateLocalToCloud();
      if (result.success && result.count > 0) {
        const loadedTasks = await storageRef.current.loadTasks();
        setTasks(loadedTasks);
        playSound('success');
      }
      setMigrationDone(true);
    };

    migrateData();
  }, [user, migrationDone, isInitialized, playSound]);

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

  const addTask = async (text: string) => {
    const newTask: Task = {
      id: uuidv4(),
      text,
      status: 'todo',
      createdAt: Date.now(),
    };

    const result = await storageRef.current.addTask(newTask);

    if (!result.success) {
      console.error('Failed to add task:', result.error);
      return;
    }

    setTasks(prev => [newTask, ...prev]);
    setCurrentTab('active');
    playSound('click');
  };

  const completeTask = async () => {
    let taskToCompleteId = selectedTaskId;

    if (mode === AppMode.AUTO && !taskToCompleteId) {
        if (activeTasks.length > 0) {
            taskToCompleteId = activeTasks[0].id;
        }
    }

    if (!taskToCompleteId) return;

    const completedAt = Date.now();
    const result = await storageRef.current.updateTask(taskToCompleteId, {
      status: 'completed',
      completedAt
    });

    if (!result.success) {
      console.error('Failed to complete task:', result.error);
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
    const result = await storageRef.current.deleteTask(id);

    if (!result.success) {
      console.error('Failed to delete task:', result.error);
      return;
    }

    setTasks(prev => prev.filter(t => t.id !== id));
    if (selectedTaskId === id) setSelectedTaskId(null);
    playSound('delete');
  };

  const restoreTask = async (id: string) => {
      const result = await storageRef.current.updateTask(id, {
        status: 'todo',
        completedAt: undefined
      });

      if (!result.success) {
        console.error('Failed to restore task:', result.error);
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
             onClick={() => {
                setMuted(!muted);
             }}
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