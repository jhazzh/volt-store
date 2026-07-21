"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import type { Category } from "@/lib/types";

/**
 * @param {{categories: Category[]}} props categories
 * @return {JSX.Element} PLP filter/sort controls (URL-driven)
 */
export function Filters({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  // Optimistic view of the query so rapid changes stack instead of reading
  // stale (last-committed) params and clobbering each other.
  const [optimistic, applyChange] = useOptimistic(
    params.toString(),
    (prev, { key, value }: { key: string; value: string }) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      return next.toString();
    }
  );

  const current = new URLSearchParams(optimistic);

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(optimistic);
    if (value) next.set(key, value);
    else next.delete(key);
    startTransition(() => {
      applyChange({ key, value });
      router.push(`${pathname}?${next.toString()}`);
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Each label+select stays together; the two groups wrap as units. */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-muted" htmlFor="category">
          Category
        </label>
        <select
          id="category"
          value={current.get("category") ?? ""}
          onChange={(e) => update("category", e.target.value)}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
        >
          <option value="">All</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm text-muted" htmlFor="sort">
          Sort
        </label>
        <select
          id="sort"
          value={current.get("sort") ?? "newest"}
          onChange={(e) => update("sort", e.target.value)}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
        >
          <option value="newest">Newest</option>
          <option value="price-asc">Price: low → high</option>
          <option value="price-desc">Price: high → low</option>
        </select>
      </div>
    </div>
  );
}
