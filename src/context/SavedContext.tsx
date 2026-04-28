import { createContext, useCallback, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "civicreach_saved_providers";

export interface SavedContextValue {
  savedIds: Set<string>;
  isSaved: (id: string) => boolean;
  toggleSaved: (id: string) => void;
  addSaved: (id: string) => void;
  removeSaved: (id: string) => void;
}

const SavedContext = createContext<SavedContextValue | null>(null);

function loadSaved(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveSaved(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

export function SavedProvider({ children }: { children: React.ReactNode }) {
  const [savedIds, setSavedIds] = useState<Set<string>>(loadSaved);

  useEffect(() => {
    setSavedIds(loadSaved());
  }, []);

  const isSaved = useCallback((id: string) => savedIds.has(id), [savedIds]);

  const addSaved = useCallback((id: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveSaved(next);
      return next;
    });
  }, []);

  const removeSaved = useCallback((id: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      saveSaved(next);
      return next;
    });
  }, []);

  const toggleSaved = useCallback((id: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveSaved(next);
      return next;
    });
  }, []);

  return (
    <SavedContext.Provider
      value={{
        savedIds,
        isSaved,
        toggleSaved,
        addSaved,
        removeSaved,
      }}
    >
      {children}
    </SavedContext.Provider>
  );
}

export function useSaved() {
  const ctx = useContext(SavedContext);
  if (!ctx) throw new Error("useSaved must be used within SavedProvider");
  return ctx;
}
