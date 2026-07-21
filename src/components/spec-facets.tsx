"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
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

  if (facets.length === 0) return null;

  // Group facets by key, preserving the query's alphabetical order.
  const groups = new Map<string, SpecFacet[]>();
  for (const f of facets) {
    (groups.get(f.key) ?? groups.set(f.key, []).get(f.key)!).push(f);
  }

  const selected = (key: string): string[] =>
    (params.get(specParamName(key)) ?? "").split(",").map((v) => v.trim()).filter(Boolean);

  const toggle = (key: string, value: string) => {
    const current = selected(key);
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];

    const search = new URLSearchParams(params);
    if (next.length > 0) search.set(specParamName(key), next.join(","));
    else search.delete(specParamName(key));
    router.push(`${pathname}?${search.toString()}`);
  };

  return (
    <aside className="space-y-6 text-sm">
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
    </aside>
  );
}
