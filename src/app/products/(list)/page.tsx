import type { Metadata } from "next";
import { Filters } from "@/components/filters";
import { SyncParsedFilters } from "@/components/sync-parsed-filters";
import { ProductCard } from "@/components/product-card";
import { SpecFacets } from "@/components/spec-facets";
import { FilterPendingProvider, GridDim } from "@/components/filter-pending";
import {
  getCategories,
  getSpecFacets,
  searchProductsResolved,
  type ProductFilters,
} from "@/lib/data";
import { parseSpecParams } from "@/lib/spec-params";

export const metadata: Metadata = {
  title: "Products",
  description: "Browse all products — audio, wearables and accessories.",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProductsPage({ searchParams }: Props) {
  const params = await searchParams;
  const asStr = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;
  const num = (v: string | string[] | undefined) => {
    const n = Number(asStr(v));
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  };
  const filters: ProductFilters = {
    category: asStr(params.category),
    sort: asStr(params.sort) as ProductFilters["sort"],
    q: asStr(params.q),
    minPrice: num(params.minPrice),
    maxPrice: num(params.maxPrice),
    specs: parseSpecParams(params),
  };

  const [{ products, filters: applied }, categories, facets] = await Promise.all([
    searchProductsResolved(filters),
    getCategories(),
    getSpecFacets(),
  ]);

  // Anything the LLM parsed out of a free-text query that isn't yet in the URL.
  // A client effect writes these in via replaceState (no redirect/refetch) so
  // the filter UI reflects them and the link stays shareable.
  const parsedExtras: Record<string, string> = {};
  const add = (k: string, v: number | string | undefined) => {
    if (v != null && v !== "" && !params[k]) parsedExtras[k] = String(v);
  };
  add("category", applied.category);
  add("sort", applied.sort);
  add("minPrice", applied.minPrice);
  add("maxPrice", applied.maxPrice);
  // The cleaned query (price/category words stripped), only if it changed.
  if (applied.q && applied.q !== asStr(params.q)) parsedExtras.q = applied.q;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <SyncParsedFilters extras={parsedExtras} />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">
          Products
          {applied.q && (
            <span className="ml-2 font-normal text-muted">
              for “{applied.q}”
            </span>
          )}
        </h1>
        <Filters categories={categories} />
      </div>

      <FilterPendingProvider>
        <div className="flex flex-col gap-8 md:flex-row">
          {/* Always rendered: holds the price filter even with no spec facets. */}
          <div className="md:w-48 md:shrink-0">
            <SpecFacets facets={facets} />
          </div>

          <div className="flex-1">
            {products.length === 0 ? (
              <p className="py-16 text-center text-muted">
                No products match your filters.
              </p>
            ) : (
              <GridDim>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3">
                  {products.map((p, i) => (
                    // First row is above the fold — the LCP lives here.
                    <ProductCard key={p.id} product={p} eager={i < 3} />
                  ))}
                </div>
              </GridDim>
            )}
          </div>
        </div>
      </FilterPendingProvider>
    </div>
  );
}
