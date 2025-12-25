import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Menu, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { Excalidraw } from '@excalidraw/excalidraw';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types';
import type { AppState, ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types';
import { UserMenu } from './UserMenu';
import { useUIStore } from '../stores/uiStore';
import { useProjectStore } from '../stores/projectStore';
import { WhiteboardStorage } from '../services/whiteboardStorage';
import { useAuth } from '../contexts/AuthContext';

// Auto-save interval in milliseconds
const AUTOSAVE_INTERVAL = 5000;

// Helper to check if data is valid Excalidraw format (not legacy tldraw)
const isValidExcalidrawData = (elements: unknown): elements is ExcalidrawElement[] => {
  if (!Array.isArray(elements)) return false;
  if (elements.length === 0) return true; // Empty is valid
  
  // Check first element has Excalidraw-specific properties
  const first = elements[0];
  if (typeof first !== 'object' || first === null) return false;
  
  // Excalidraw elements have these required fields
  const hasExcalidrawFields = 
    'type' in first && 
    'x' in first && 
    'y' in first && 
    'id' in first;
  
  // tldraw elements have different structure (typeName, props, etc.)
  const hasTldrawFields = 'typeName' in first || 'props' in first;
  
  return hasExcalidrawFields && !hasTldrawFields;
};

export const WhiteboardView: React.FC = () => {
  const { muted, toggleMuted, setSidebarMobileOpen } = useUIStore();
  const { currentProjectId, projects } = useProjectStore();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [initialData, setInitialData] = useState<{
    elements: ExcalidrawElement[];
    appState: Partial<AppState>;
  } | null>(null);
  
  const excalidrawRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const storageRef = useRef<WhiteboardStorage>(new WhiteboardStorage(user?.id || null));
  const lastSavedRef = useRef<string>('');
  const pendingSaveRef = useRef<boolean>(false);

  const currentProject = projects.find(p => p.id === currentProjectId);

  // Update storage userId when user changes
  useEffect(() => {
    storageRef.current.setUserId(user?.id || null);
  }, [user]);

  // Load whiteboard data when project changes
  useEffect(() => {
    if (!currentProjectId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function loadWhiteboardData() {
      setIsLoading(true);

      try {
        const data = await storageRef.current.loadWhiteboard(currentProjectId!);
        if (cancelled) return;

        if (data && data.documentSnapshot) {
          const rawElements = data.documentSnapshot.elements || [];
          const appState = data.sessionSnapshot || {};
          
          // Validate data format - tldraw data is incompatible with Excalidraw
          if (isValidExcalidrawData(rawElements)) {
            setInitialData({
              elements: rawElements,
              appState: {
                ...appState,
                theme: 'dark',
              },
            });
          } else {
            // Legacy tldraw data detected - cannot migrate, start fresh
            console.warn(
              '[Whiteboard] Legacy tldraw data detected. Starting with fresh canvas. ' +
              'Previous whiteboard data is incompatible with the new Excalidraw format.'
            );
            setInitialData({
              elements: [],
              appState: { theme: 'dark' },
            });
          }
        } else {
          setInitialData({
            elements: [],
            appState: { theme: 'dark' },
          });
        }
      } catch (error) {
        console.error('Failed to load whiteboard:', error);
        if (cancelled) return;
        
        setInitialData({
          elements: [],
          appState: { theme: 'dark' },
        });
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadWhiteboardData();

    return () => {
      cancelled = true;
    };
  }, [currentProjectId]);

  // Save function
  const saveWhiteboard = useCallback(async () => {
    if (!excalidrawRef.current || !currentProjectId || pendingSaveRef.current) return;

    const elements = excalidrawRef.current.getSceneElements();
    const appState = excalidrawRef.current.getAppState();
    
    const dataString = JSON.stringify({ elements, appState });
    
    // Skip if nothing changed
    if (dataString === lastSavedRef.current) return;

    try {
      pendingSaveRef.current = true;
      setIsSaving(true);

      await storageRef.current.saveWhiteboard(currentProjectId, {
        document: { elements },
        session: { 
          viewBackgroundColor: appState.viewBackgroundColor,
          zoom: appState.zoom,
          scrollX: appState.scrollX,
          scrollY: appState.scrollY,
        },
      });

      lastSavedRef.current = dataString;
    } catch (error) {
      console.error('Failed to save whiteboard:', error);
    } finally {
      pendingSaveRef.current = false;
      setIsSaving(false);
    }
  }, [currentProjectId]);

  // Auto-save on interval
  useEffect(() => {
    const interval = setInterval(saveWhiteboard, AUTOSAVE_INTERVAL);
    return () => clearInterval(interval);
  }, [saveWhiteboard]);

  // Save on unmount
  useEffect(() => {
    return () => {
      saveWhiteboard();
    };
  }, [saveWhiteboard]);

    // Handle no project selected
  if (!currentProjectId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="font-pixel text-white/60">No project selected</p>
          <p className="font-pixel text-white/40 text-sm mt-2">
            Select a project from the sidebar to use the whiteboard
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-6 py-4 bg-black/20 border-b border-white/5 backdrop-blur-sm shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarMobileOpen(true)}
            className="md:hidden p-2 -ml-2 text-white/60 hover:text-white"
          >
            <Menu size={20} />
          </button>

          <div>
            <h1 className="font-game text-sm text-arcade-pink">WHITEBOARD</h1>
            <p className="text-xs font-pixel text-white/40 mt-0.5">
              {currentProject?.name || 'Project'} - Freeform canvas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Save indicator */}
          {isSaving && (
            <div className="flex items-center gap-2 text-white/40">
              <Loader2 size={14} className="animate-spin" />
              <span className="font-pixel text-xs">Saving...</span>
            </div>
          )}

          <button
            onClick={toggleMuted}
            className="text-white/30 hover:text-white transition-colors"
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          <UserMenu />
        </div>
      </div>

      {/* Whiteboard Canvas */}
      <div className="flex-1 relative whiteboard-container">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-arcade-pink border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="font-pixel text-white/40">Loading whiteboard...</p>
            </div>
          </div>
        ) : (
          <Excalidraw
            excalidrawAPI={(api) => {
              excalidrawRef.current = api;
            }}
            initialData={initialData || undefined}
            theme="dark"
            UIOptions={{
              canvasActions: {
                loadScene: false,
                export: { saveFileToDisk: true },
              },
            }}
          />
        )}
      </div>

      <style>{`
        .whiteboard-container .excalidraw {
          height: 100%;
        }
        .whiteboard-container .excalidraw .App-menu_top {
          z-index: 10;
        }
      `}</style>
    </>
  );
};
