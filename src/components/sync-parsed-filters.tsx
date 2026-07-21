"use client";

import { useEffect } from "react";

/**
 * Writes LLM-parsed filter values (price/category/sort + cleaned query) into
 * the URL without a navigation, so the URL-driven filter UI reflects them and
 * the search stays shareable. Uses replaceState — no server round-trip, no
 * history entry, so Back still returns to the page before the search.
 * @param {{ extras: Record<string, string> }} props parsed params to merge in
 * @return {null} renders nothing
 */
export function SyncParsedFilters({ extras }: { extras: Record<string, string> }) {
  // Serialize so the effect re-runs only when the parsed values actually change.
  const key = JSON.stringify(extras);

  useEffect(() => {
    const entries = Object.entries(extras);
    if (entries.length === 0) return;

    // Merge into the current query (keep existing params), then replaceState.
    // Next integrates this into its router, so useSearchParams in the filter
    // components updates and the price/category/sort controls reflect it.
    const params = new URLSearchParams(window.location.search);
    for (const [k, v] of entries) params.set(k, v);
    window.history.replaceState(null, "", `?${params.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return null;
}
