"use client";

import Link from "next/link";
import { useCompare } from "@/components/compare/compare-context";
import { COMPARE_MIN } from "@/lib/compare-limits";

/**
 * Floating control for compare mode. When off, a single button turns it on and
 * reveals the card checkboxes. When on, shows the selection count, a way to
 * clear/exit, and a Compare link once COMPARE_MIN are picked.
 * @return {JSX.Element | null} floating bar, or nothing until hydrated
 */
export function CompareBar() {
  const { ids, clear, mode, setMode, loaded } = useCompare();
  if (!loaded) return null;

  const ready = ids.length >= COMPARE_MIN;

  return (
    <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      {!mode ? (
        <button
          type="button"
          onClick={() => setMode(true)}
          className="rounded-full border border-border bg-background/95 px-5 py-2 text-sm font-medium shadow-lg backdrop-blur hover:border-accent transition-colors"
        >
          Compare products
        </button>
      ) : (
        <div className="flex items-center gap-3 rounded-full border border-border bg-background/95 px-4 py-2 text-sm shadow-lg backdrop-blur">
          <span className="font-medium">{ids.length} selected</span>
          <button
            type="button"
            onClick={() => {
              clear();
              setMode(false);
            }}
            className="text-muted hover:text-accent transition-colors"
          >
            Cancel
          </button>
          {ready ? (
            <Link
              href={`/compare?ids=${ids.join(",")}`}
              className="rounded-full bg-accent px-4 py-1.5 font-semibold text-accent-foreground"
            >
              Compare {ids.length}
            </Link>
          ) : (
            <span className="rounded-full bg-border px-4 py-1.5 text-muted">
              Pick {COMPARE_MIN - ids.length} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}
