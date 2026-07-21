"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useOptimistic, useState, useTransition } from "react";
import { useFilterPending } from "@/components/filter-pending";
import { specParamName } from "@/lib/spec-params";
import type { SpecFacet } from "@/lib/types";

/**
 * Facet filter sidebar: checkboxes grouped by spec key, driven by URL params.
 * Same key toggles OR; across keys is AND (matches getProducts).
 * @param {{ facets: SpecFacet[] }} props all (key, value, count) options
 */
export function SpecFacets({ facets }: { facets: SpecFacet[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const { setPending } = useFilterPending();
  const [mobileOpen, setMobileOpen] = useState(false); // collapsed by default on mobile

  // Publish the fetch state so the grid can dim while filters resolve.
  useEffect(() => setPending(isPending), [isPending, setPending]);

  // Optimistic view of the params, so clicks flip instantly while the URL
  // update + server round-trip run in the background.
  const [optimisticParams, applyToggle] = useOptimistic(
    params.toString(),
    (prev, { key, value }: { key: string; value: string }) => {
      const search = new URLSearchParams(prev);
      const name = specParamName(key);
      const current = (search.get(name) ?? "").split(",").map((v) => v.trim()).filter(Boolean);
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      if (next.length > 0) search.set(name, next.join(","));
      else search.delete(name);
      return search.toString();
    }
  );

  if (facets.length === 0) return null;

  // Group facets by key, preserving the query's alphabetical order.
  const groups = new Map<string, SpecFacet[]>();
  for (const f of facets) {
    (groups.get(f.key) ?? groups.set(f.key, []).get(f.key)!).push(f);
  }

  const selected = (key: string): string[] =>
    (new URLSearchParams(optimisticParams).get(specParamName(key)) ?? "")
      .split(",").map((v) => v.trim()).filter(Boolean);

  const toggle = (key: string, value: string) => {
    // Build the next URL from the optimistic params, not the last-committed
    // `params` — so rapid clicks before a commit stack instead of clobbering.
    const search = new URLSearchParams(optimisticParams);
    const name = specParamName(key);
    const current = (search.get(name) ?? "").split(",").map((v) => v.trim()).filter(Boolean);
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    if (next.length > 0) search.set(name, next.join(","));
    else search.delete(name);

    startTransition(() => {
      applyToggle({ key, value });
      router.push(`${pathname}?${search.toString()}`);
    });
  };

  // Total active filters, shown in the mobile summary.
  const activeCount = [...groups.keys()].reduce((n, key) => n + selected(key).length, 0);

  return (
    // Collapsible on mobile (saves vertical space); always open on desktop via
    // [&]:open — the `open` attribute is toggled by the user on small screens.
    <div className="text-sm">
      <button
        type="button"
        onClick={() => setMobileOpen((v) => !v)}
        aria-expanded={mobileOpen}
        className="mb-2 flex w-full cursor-pointer items-center justify-between rounded-md border border-border px-3 py-2 font-semibold sm:hidden"
      >
        <span>Filters{activeCount > 0 ? ` (${activeCount})` : ""}</span>
        <svg
          width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden
          className={`text-muted transition-transform ${mobileOpen ? "rotate-180" : ""}`}
        >
          <path d="M5 7l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {/* Collapsed on mobile unless toggled open; always shown from sm up. */}
      <div className={`${mobileOpen ? "block" : "hidden"} space-y-6 sm:!block`}>
      {[...groups.entries()].map(([key, options]) => (
        <div key={key}>
          <h3 className="mb-2 font-semibold">{key}</h3>
          <ul className="space-y-1">
            {options.map((f) => {
              const checked = selected(key).includes(f.value);
              return (
                <li key={f.value}>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(key, f.value)}
                      className="accent-accent"
                    />
                    <span className="flex-1">{f.value}</span>
                    <span className="text-xs text-muted">{f.count}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      </div>
    </div>
  );
}
