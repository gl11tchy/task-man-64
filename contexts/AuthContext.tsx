import React, { createContext, useContext, useEffect, useState } from 'react';

// Simple user type for local auth
interface User {
  id: string;
  email: string;
}

interface Session {
  user: User;
  access_token: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AUTH_STORAGE_KEY = 'workstation_auth';

// Generate a deterministic user ID from email - consistent across signUp and signIn
const generateUserId = (email: string): string => {
  return `user_${email.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_')}`;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load auth state from localStorage
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const authData = JSON.parse(stored);
        setUser(authData.user);
        setSession(authData.session);
      }
    } catch (error) {
      console.error('Failed to load auth state:', error);
    }
    setLoading(false);
  }, []);

  const saveAuthState = (user: User | null, session: Session | null) => {
    if (user && session) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user, session }));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  };

  const signUp = async (email: string, password: string): Promise<{ error: Error | null }> => {
    try {
      // Simple local auth - in production, use a proper auth provider
      // Use deterministic ID so data persists across signIn/signOut
      const userId = generateUserId(email);
      const newUser: User = { id: userId, email };
      const newSession: Session = {
        user: newUser,
        access_token: `token_${Date.now()}`,
      };

      setUser(newUser);
      setSession(newSession);
      saveAuthState(newUser, newSession);

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    try {
      // Simple local auth - in production, use a proper auth provider
      // Use deterministic ID so data persists across signIn/signOut
      const userId = generateUserId(email);
      const newUser: User = { id: userId, email };
      const newSession: Session = {
        user: newUser,
        access_token: `token_${Date.now()}`,
      };

      setUser(newUser);
      setSession(newSession);
      saveAuthState(newUser, newSession);

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    setUser(null);
    setSession(null);
    saveAuthState(null, null);
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
