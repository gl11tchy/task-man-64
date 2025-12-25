import React, { useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { WorkstationView } from './components/WorkstationView';
import { KanbanView } from './components/KanbanView';
import { BacklogViewWrapper } from './components/BacklogViewWrapper';
import { SettingsView } from './components/SettingsView';

import { WhiteboardView } from './components/WhiteboardView';
import { QuickSwitcher } from './components/QuickSwitcher';
import { useAuth } from './contexts/AuthContext';
import { useProjectStore } from './stores/projectStore';
import { useUIStore } from './stores/uiStore';
import { ProjectStorage } from './services/projectStorage';
import { TaskStorage } from './services/taskStorage';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { quickSwitcherOpen, closeQuickSwitcher, openQuickSwitcher, setCurrentView } = useUIStore();
  const { setStorageRefs, initialize, isInitialized, setCurrentProject, projects } = useProjectStore();

  const projectStorageRef = useRef(new ProjectStorage());
  const taskStorageRef = useRef(new TaskStorage());

  // Update storage refs when user changes
  useEffect(() => {
    projectStorageRef.current.setUserId(user?.id || null);
    taskStorageRef.current.setUserId(user?.id || null);
  }, [user]);

  // Initialize stores
  useEffect(() => {
    if (authLoading) return;

    setStorageRefs(projectStorageRef.current, taskStorageRef.current);
    initialize();
  }, [authLoading, user, setStorageRefs, initialize]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K - Quick switcher
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openQuickSwitcher();
        return;
      }

      // Cmd/Ctrl + 1/2/3/4 - View switching
      if ((e.metaKey || e.ctrlKey) && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        switch (e.key) {
          case '1':
            navigate('/');
            setCurrentView('workstation');
            break;
          case '2':
            navigate('/kanban');
            setCurrentView('kanban');
            break;
          case '3':
            navigate('/backlog');
            setCurrentView('backlog');
            break;
          case '4':
            navigate('/whiteboard');
            setCurrentView('whiteboard');
            break;
        }
        return;
      }

      // Cmd/Ctrl + [ - Toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === '[') {
        e.preventDefault();
        useUIStore.getState().toggleSidebar();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, openQuickSwitcher, setCurrentView]);

  // Update current view based on route
  useEffect(() => {
    const path = location.pathname;
    if (path === '/') {
      setCurrentView('workstation');
    } else if (path === '/kanban') {
      setCurrentView('kanban');
    } else if (path === '/backlog') {
      setCurrentView('backlog');
    } else if (path === '/whiteboard') {
      setCurrentView('whiteboard');
    }
  }, [location.pathname, setCurrentView]);

    if (!isInitialized) {
    return (
      <Layout showSidebar={false}>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-arcade-pink border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="font-pixel text-white/40">Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Layout>
        <Routes>
          <Route path="/" element={<WorkstationView />} />
          <Route path="/kanban" element={<KanbanView />} />
          <Route path="/backlog" element={<BacklogViewWrapper />} />
          <Route path="/whiteboard" element={<WhiteboardView />} />
          <Route path="/settings" element={<SettingsView />} />
        </Routes>
      </Layout>

      {/* Quick Switcher Modal */}
      {quickSwitcherOpen && (
        <QuickSwitcher
          onClose={closeQuickSwitcher}
          onSelectProject={(projectId) => {
            setCurrentProject(projectId);
            closeQuickSwitcher();
          }}
          projects={projects.filter(p => !p.isArchived)}
        />
      )}
    </>
  );
}
