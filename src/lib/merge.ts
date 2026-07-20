import type { Product } from "@/lib/types";
import type { ProductFilters } from "@/lib/data";

/**
 * Merge keyword and semantic search hits. Pure — no I/O, no `server-only`
 * import — so it stays directly unit-testable.
 * @param {Product[]} keyword ilike matches (already category/sort filtered)
 * @param {Product[]} semantic embedding matches (ignores category)
 * @param {Set<string> | null} allowedIds ids in the active category, or null
 * @param {ProductFilters["sort"]} sort active sort, if any
 * @return {Product[]} merged, deduped, ordered results
 */
export function mergeSearchResults(
  keyword: Product[],
  semantic: Product[],
  allowedIds: Set<string> | null,
  sort?: ProductFilters["sort"]
): Product[] {
  const seen = new Set(keyword.map((p) => p.id));
  const extra = semantic.filter(
    (p) => !seen.has(p.id) && (!allowedIds || allowedIds.has(p.id))
  );

  // An explicit sort must win over relevance ordering.
  if (sort === "price-asc" || sort === "price-desc") {
    const dir = sort === "price-asc" ? 1 : -1;
    return [...keyword, ...extra].sort(
      (a, b) => (Number(a.price) - Number(b.price)) * dir
    );
  }
  return [...keyword, ...extra];
}
