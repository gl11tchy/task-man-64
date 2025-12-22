import React, { useState } from 'react';
import { X, LogIn, UserPlus, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Portal } from './Portal';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message || 'Failed to log in');
        } else {
          onSuccess?.();
          onClose();
        }
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          setError(error.message || 'Failed to sign up');
        } else {
          onSuccess?.();
          onClose();
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div className="relative w-full max-w-md bg-arcade-panel/95 backdrop-blur-md rounded-2xl p-6 shadow-[0_0_50px_rgba(157,0,255,0.4)] border-4 border-[#ffffff20] ring-4 ring-arcade-purple">

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-pixel text-arcade-cyan drop-shadow-neon-cyan mb-2">
            {mode === 'login' ? 'LOGIN' : 'SIGN UP'}
          </h2>
          <p className="text-sm text-white/60 font-game">
            {mode === 'login'
              ? 'Sync your tasks across devices'
              : 'Create an account to save your progress'}
          </p>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
            }}
            className={`flex-1 py-2 px-4 rounded-lg font-game text-sm transition-all ${
              mode === 'login'
                ? 'bg-arcade-purple text-white shadow-neon-purple'
                : 'bg-black/40 text-white/60 hover:text-white'
            }`}
          >
            <LogIn size={16} className="inline mr-2" />
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError('');
            }}
            className={`flex-1 py-2 px-4 rounded-lg font-game text-sm transition-all ${
              mode === 'signup'
                ? 'bg-arcade-purple text-white shadow-neon-purple'
                : 'bg-black/40 text-white/60 hover:text-white'
            }`}
          >
            <UserPlus size={16} className="inline mr-2" />
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-game text-white/70 mb-2 uppercase tracking-wider">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-black/40 border-2 border-white/10 rounded-lg text-white placeholder-white/30 focus:border-arcade-cyan focus:outline-none focus:shadow-neon-cyan transition-all font-game"
              placeholder="player@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-game text-white/70 mb-2 uppercase tracking-wider">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 bg-black/40 border-2 border-white/10 rounded-lg text-white placeholder-white/30 focus:border-arcade-cyan focus:outline-none focus:shadow-neon-cyan transition-all font-game"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm font-game">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-6 bg-arcade-pink hover:bg-arcade-pink/80 disabled:bg-gray-500/50 text-white font-pixel text-lg rounded-lg shadow-neon-pink hover:shadow-neon-pink-strong transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>PROCESSING...</span>
              </>
            ) : (
              <span>{mode === 'login' ? 'LOGIN' : 'CREATE ACCOUNT'}</span>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-white/50 font-game">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setError('');
              }}
              className="ml-2 text-arcade-cyan hover:text-arcade-cyan/80 transition-colors"
            >
              {mode === 'login' ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-white/40 hover:text-white/60 transition-colors font-game"
          >
            Continue without account
          </button>
          </div>
        </div>
      </div>
    </Portal>
  );
};
