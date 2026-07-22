"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { COMPARE_MAX } from "@/lib/compare-limits";

const STORAGE_KEY = "compare:v1";

type CompareContextValue = {
  ids: string[];
  toggle: (id: string) => void;
  clear: () => void;
  has: (id: string) => boolean;
  full: boolean; // COMPARE_MAX reached — block adding more
  mode: boolean; // compare mode on → card checkboxes visible
  setMode: (on: boolean) => void;
  loaded: boolean; // false until localStorage is read (post-mount)
};

const CompareContext = createContext<CompareContextValue | null>(null);

/**
 * Holds the shopper's compare selection (ids), persisted to localStorage.
 * Mirrors the cart provider's hydration-safe load/save pattern.
 * @param {{children: ReactNode}} props children
 * @return {JSX.Element} provider
 */
export function CompareProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [mode, setMode] = useState(false); // session-only; not persisted
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setIds(JSON.parse(raw));
    } catch {
      // corrupted storage — start empty
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return; // don't clobber saved selection before load
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }, [ids, loaded]);

  const toggle = (id: string) => {
    setIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length >= COMPARE_MAX
          ? prev // at cap — ignore
          : [...prev, id]
    );
  };

  return (
    <CompareContext.Provider
      value={{
        ids,
        toggle,
        clear: () => setIds([]),
        has: (id) => ids.includes(id),
        full: ids.length >= COMPARE_MAX,
        mode,
        setMode,
        loaded,
      }}
    >
      {children}
    </CompareContext.Provider>
  );
}

/**
 * @return {CompareContextValue} compare context
 */
export function useCompare(): CompareContextValue {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare must be used within CompareProvider");
  return ctx;
}
