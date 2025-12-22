import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ViewType, AppMode } from '../types';

const SIDEBAR_COLLAPSED_KEY = 'workstation_sidebar_collapsed';

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

  // Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarMobileOpen: (open: boolean) => void;
  setCurrentView: (view: ViewType) => void;
  setMode: (mode: AppMode) => void;
  toggleMuted: () => void;
  openQuickSwitcher: () => void;
  closeQuickSwitcher: () => void;
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

      // Actions
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setSidebarMobileOpen: (open) => set({ sidebarMobileOpen: open }),
      setCurrentView: (view) => set({ currentView: view }),
      setMode: (mode) => set({ mode }),
      toggleMuted: () => set((state) => ({ muted: !state.muted })),
      openQuickSwitcher: () => set({ quickSwitcherOpen: true }),
      closeQuickSwitcher: () => set({ quickSwitcherOpen: false }),
    }),
    {
      name: 'workstation-ui-store',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        muted: state.muted,
        mode: state.mode,
      }),
    }
  )
);
