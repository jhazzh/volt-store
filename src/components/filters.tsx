"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Category } from "@/lib/types";

/**
 * @param {{categories: Category[]}} props categories
 * @return {JSX.Element} PLP filter/sort controls (URL-driven)
 */
export function Filters({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`${pathname}?${next.toString()}`);
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
          value={params.get("category") ?? ""}
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
          value={params.get("sort") ?? "newest"}
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
