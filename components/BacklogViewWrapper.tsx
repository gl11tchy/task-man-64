import React from 'react';
import { Menu, Volume2, VolumeX } from 'lucide-react';
import { BacklogView } from './BacklogView';
import { UserMenu } from './UserMenu';
import { useUIStore } from '../stores/uiStore';

export const BacklogViewWrapper: React.FC = () => {
  const { muted, toggleMuted, setSidebarMobileOpen } = useUIStore();

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-6 py-4 bg-black/20 border-b border-white/5 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarMobileOpen(true)}
            className="md:hidden p-2 -ml-2 text-white/60 hover:text-white"
          >
            <Menu size={20} />
          </button>

          <div>
            <h1 className="font-game text-sm text-arcade-cyan">AUTOCLAUDE</h1>
            <p className="text-xs font-pixel text-white/40 mt-0.5">
              Configure autoclaude and enter keys
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={toggleMuted}
            className="text-white/30 hover:text-white transition-colors"
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          <UserMenu />
        </div>
      </div>

      {/* Backlog Content */}
      <BacklogView />
    </>
  );
};
