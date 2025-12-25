import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ViewType, AppMode } from '../types';

const SIDEBAR_COLLAPSED_KEY = 'workstation_sidebar_collapsed';
const SCORE_STORAGE_KEY = 'workstation_score';

interface UIState {
  // Sidebar state
  sidebarCollapsed: boolean;
  sidebarMobileOpen: boolean;

  // Current view
  currentView: ViewType;

  // App mode (AUTO/MANUAL)
  mode: AppMode;

  // Audio
  muted: boolean;

  // Quick switcher
  quickSwitcherOpen: boolean;

  // Whiteboard fullscreen
  whiteboardFullscreen: boolean;

  // Gamification
  score: number;

  // Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarMobileOpen: (open: boolean) => void;
  setCurrentView: (view: ViewType) => void;
  setMode: (mode: AppMode) => void;
  toggleMuted: () => void;
  openQuickSwitcher: () => void;
  closeQuickSwitcher: () => void;
  toggleWhiteboardFullscreen: () => void;
  setWhiteboardFullscreen: (fullscreen: boolean) => void;
  addScore: (points: number) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Initial state
      sidebarCollapsed: false,
      sidebarMobileOpen: false,
      currentView: 'workstation',
      mode: AppMode.AUTO,
      muted: false,
      quickSwitcherOpen: false,
      whiteboardFullscreen: false,
      score: 0,

      // Actions
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setSidebarMobileOpen: (open) => set({ sidebarMobileOpen: open }),
      setCurrentView: (view) => set({ currentView: view }),
      setMode: (mode) => set({ mode }),
      toggleMuted: () => set((state) => ({ muted: !state.muted })),
      openQuickSwitcher: () => set({ quickSwitcherOpen: true }),
      closeQuickSwitcher: () => set({ quickSwitcherOpen: false }),
      toggleWhiteboardFullscreen: () => set((state) => ({ whiteboardFullscreen: !state.whiteboardFullscreen })),
      setWhiteboardFullscreen: (fullscreen) => set({ whiteboardFullscreen: fullscreen }),
      addScore: (points) => set((state) => ({ score: state.score + points })),
    }),
    {
      name: 'workstation-ui-store',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        muted: state.muted,
        mode: state.mode,
        score: state.score,
      }),
    }
  )
);
