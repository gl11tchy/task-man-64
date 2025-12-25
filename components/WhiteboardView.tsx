import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Menu, Volume2, VolumeX, Loader2 } from 'lucide-react';
import {
  Tldraw,
  getSnapshot,
  loadSnapshot,
  useEditor,
  TLStoreWithStatus,
  createTLStore,
} from 'tldraw';
import 'tldraw/tldraw.css';
import { UserMenu } from './UserMenu';
import { useUIStore } from '../stores/uiStore';
import { useProjectStore } from '../stores/projectStore';
import { WhiteboardStorage } from '../services/whiteboardStorage';
import { useAuth } from '../contexts/AuthContext';

// Auto-save interval in milliseconds
const AUTOSAVE_INTERVAL = 5000;

// Inner component that has access to editor context
const WhiteboardAutoSave: React.FC<{
  projectId: string;
  storage: WhiteboardStorage;
  onSaveStatusChange: (saving: boolean) => void;
}> = ({ projectId, storage, onSaveStatusChange }) => {
  const editor = useEditor();
  const pendingSaveRef = useRef<boolean>(false);
  const lastSnapshotRef = useRef<string>('');

  const saveWhiteboard = useCallback(async () => {
    if (!editor || pendingSaveRef.current) return;

    try {
      const snapshot = getSnapshot(editor.store);
      const snapshotString = JSON.stringify(snapshot);

      // Skip if nothing changed
      if (snapshotString === lastSnapshotRef.current) return;

      pendingSaveRef.current = true;
      onSaveStatusChange(true);

      await storage.saveWhiteboard(projectId, {
        document: snapshot.document,
        session: snapshot.session,
      });

      lastSnapshotRef.current = snapshotString;
    } catch (error) {
      console.error('Failed to save whiteboard:', error);
    } finally {
      pendingSaveRef.current = false;
      onSaveStatusChange(false);
    }
  }, [editor, projectId, storage, onSaveStatusChange]);

  // Auto-save on interval
  useEffect(() => {
    const interval = setInterval(() => {
      saveWhiteboard();
    }, AUTOSAVE_INTERVAL);

    return () => clearInterval(interval);
  }, [saveWhiteboard]);

  // Save on unmount
  useEffect(() => {
    return () => {
      saveWhiteboard();
    };
  }, [saveWhiteboard]);

  return null;
};

export const WhiteboardView: React.FC = () => {
  const { muted, toggleMuted, setSidebarMobileOpen } = useUIStore();
  const { currentProjectId, projects } = useProjectStore();
  const { user } = useAuth();

  const [storeWithStatus, setStoreWithStatus] = useState<TLStoreWithStatus>({
    status: 'loading',
  });
  const [isSaving, setIsSaving] = useState(false);
  const storageRef = useRef<WhiteboardStorage>(new WhiteboardStorage(user?.id || null));

  const currentProject = projects.find(p => p.id === currentProjectId);

  // Update storage userId when user changes
  useEffect(() => {
    storageRef.current.setUserId(user?.id || null);
  }, [user]);

  // Load whiteboard data when project changes
  useEffect(() => {
    if (!currentProjectId) {
      setStoreWithStatus({ status: 'not-found' });
      return;
    }

    let cancelled = false;

    async function loadWhiteboardData() {
      setStoreWithStatus({ status: 'loading' });

      try {
        const data = await storageRef.current.loadWhiteboard(currentProjectId!);
        if (cancelled) return;

        const newStore = createTLStore();

        if (data && data.documentSnapshot && Object.keys(data.documentSnapshot).length > 0) {
          // Load existing snapshot
          try {
            loadSnapshot(newStore, {
              document: data.documentSnapshot as any,
              session: data.sessionSnapshot as any,
            });
          } catch (e) {
            console.warn('Failed to load snapshot, starting fresh:', e);
          }
        }

        setStoreWithStatus({
          store: newStore,
          status: 'synced-remote',
        });
      } catch (error) {
        console.error('Failed to load whiteboard:', error);
        if (cancelled) return;

        // Create empty store on error
        setStoreWithStatus({
          store: createTLStore(),
          status: 'synced-local',
        });
      }
    }

    loadWhiteboardData();

    return () => {
      cancelled = true;
    };
  }, [currentProjectId]);

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
        {storeWithStatus.status === 'loading' ? (
          <div className="flex-1 flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-arcade-pink border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="font-pixel text-white/40">Loading whiteboard...</p>
            </div>
          </div>
        ) : (
          <Tldraw
            store={storeWithStatus}
            onMount={(editor) => {
              // Set dark mode to match app theme
              editor.user.updateUserPreferences({ colorScheme: 'dark' });
            }}
          >
            <WhiteboardAutoSave
              projectId={currentProjectId}
              storage={storageRef.current}
              onSaveStatusChange={setIsSaving}
            />
          </Tldraw>
        )}
      </div>
    </>
  );
};
