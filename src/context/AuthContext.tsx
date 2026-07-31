import React, { createContext, useContext, useEffect, useState } from 'react';
import type { JellyfinUser } from '@/lib/types';

interface AuthContextValue {
  user: JellyfinUser | null;
  setUser: (user: JellyfinUser | null) => void;
  isLoading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<JellyfinUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem('jellyfin-user');
    if (raw) {
      try {
        setUser(JSON.parse(raw));
      } catch {
        localStorage.removeItem('jellyfin-user');
      }
    }
    setIsLoading(false);
  }, []);

  const handleSetUser = (u: JellyfinUser | null) => {
    setUser(u);
    if (u) localStorage.setItem('jellyfin-user', JSON.stringify(u));
    else localStorage.removeItem('jellyfin-user');
  };

  const logout = () => {
    handleSetUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, setUser: handleSetUser, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
