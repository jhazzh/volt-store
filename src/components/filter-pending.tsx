"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

// Shares "a facet filter is fetching" between SpecFacets (which starts the
// navigation) and the grid wrapper (which dims while it's in flight). The
// facets and grid are siblings, so a context is the simplest bridge.
type Ctx = { pending: boolean; setPending: (v: boolean) => void };
const FilterPendingContext = createContext<Ctx | null>(null);

export function FilterPendingProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState(false);
  return (
    <FilterPendingContext.Provider value={{ pending, setPending }}>
      {children}
    </FilterPendingContext.Provider>
  );
}

export function useFilterPending() {
  const ctx = useContext(FilterPendingContext);
  if (!ctx) throw new Error("useFilterPending must be used within FilterPendingProvider");
  return ctx;
}

/** Dims + disables its children while a facet filter is fetching. */
export function GridDim({ children }: { children: ReactNode }) {
  const { pending } = useFilterPending();
  return (
    <div
      className={
        pending ? "pointer-events-none opacity-50 transition-opacity" : "transition-opacity"
      }
      aria-busy={pending}
    >
      {children}
    </div>
  );
}
