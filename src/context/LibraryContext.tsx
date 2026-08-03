import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchLibraries } from '@/lib/jellyfin';
import type { JellyfinItem } from '@/lib/types';

const STORAGE_KEY = 'jellyfin-library-id';

interface LibraryContextValue {
  /** All libraries (Views) the user has access to. Empty until loaded. */
  libraries: JellyfinItem[];
  /** Selected library Id, or '' for "All Libraries" (unscoped — current default behavior). */
  libraryId: string;
  setLibraryId: (id: string) => void;
  isLoading: boolean;
}

const LibraryContext = createContext<LibraryContextValue | undefined>(undefined);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [libraries, setLibraries] = useState<JellyfinItem[]>([]);
  const [libraryId, setLibraryIdState] = useState<string>(() => localStorage.getItem(STORAGE_KEY) || '');
  const [isLoading, setIsLoading] = useState(true);

  const setLibraryId = useCallback((id: string) => {
    setLibraryIdState(id);
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  useEffect(() => {
    if (!user) {
      setLibraries([]);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    fetchLibraries(user.AccessToken, user.Id)
      .then((items) => {
        if (cancelled) return;
        setLibraries(items);
        // If a previously-selected library no longer exists (deleted/permissions changed), reset to "All".
        setLibraryIdState((current) => (current && !items.some((l) => l.Id === current) ? '' : current));
      })
      .catch(() => !cancelled && setLibraries([]))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <LibraryContext.Provider value={{ libraries, libraryId, setLibraryId, isLoading }}>
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used within LibraryProvider');
  return ctx;
}
