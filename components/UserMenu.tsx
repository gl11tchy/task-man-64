import React, { useState } from 'react';
import { User, LogOut, Cloud, HardDrive } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AuthModal } from './AuthModal';

export const UserMenu: React.FC = () => {
  const { user, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = async () => {
    await signOut();
    setShowMenu(false);
  };

  if (!user) {
    return (
      <>
        <button
          onClick={() => setShowAuthModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-black/40 hover:bg-arcade-purple/30 border border-white/10 hover:border-arcade-purple rounded-lg transition-all font-game text-sm text-white/70 hover:text-white"
        >
          <User size={14} />
          <span>Login</span>
        </button>
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      </>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-3 py-1.5 bg-arcade-purple/30 border border-arcade-purple/50 rounded-lg hover:bg-arcade-purple/40 transition-all"
      >
        <Cloud size={14} className="text-arcade-cyan" />
        <span className="text-xs font-game text-white/90 max-w-[120px] truncate">
          {user.email?.split('@')[0]}
        </span>
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-64 bg-arcade-panel/95 backdrop-blur-md rounded-xl border-2 border-white/10 shadow-[0_0_30px_rgba(157,0,255,0.3)] z-50 overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Cloud size={16} className="text-arcade-cyan" />
                <span className="text-xs font-game text-arcade-cyan uppercase tracking-wider">
                  Cloud Sync Active
                </span>
              </div>
              <p className="text-sm font-game text-white/90 truncate">
                {user.email}
              </p>
            </div>

            <div className="p-2">
              <div className="px-3 py-2 flex items-center gap-2 text-xs font-game text-white/60">
                <HardDrive size={14} />
                <span>Tasks synced to cloud</span>
              </div>
            </div>

            <div className="p-2 border-t border-white/10">
              <button
                onClick={handleLogout}
                className="w-full px-3 py-2 flex items-center gap-2 text-sm font-game text-white/70 hover:text-white hover:bg-red-500/20 rounded-lg transition-all"
              >
                <LogOut size={14} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
