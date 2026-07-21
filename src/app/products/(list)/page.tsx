import type { Metadata } from "next";
import { Filters } from "@/components/filters";
import { ProductCard } from "@/components/product-card";
import { SpecFacets } from "@/components/spec-facets";
import { FilterPendingProvider, GridDim } from "@/components/filter-pending";
import {
  getCategories,
  getSpecFacets,
  searchProducts,
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
  const filters: ProductFilters = {
    category: asStr(params.category),
    sort: asStr(params.sort) as ProductFilters["sort"],
    q: asStr(params.q),
    specs: parseSpecParams(params),
  };

  const [products, categories, facets] = await Promise.all([
    searchProducts(filters),
    getCategories(),
    getSpecFacets(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Products</h1>
        <Filters categories={categories} />
      </div>

      <FilterPendingProvider>
        <div className="flex flex-col gap-8 md:flex-row">
          {facets.length > 0 && (
            <div className="md:w-48 md:shrink-0">
              <SpecFacets facets={facets} />
            </div>
          )}

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
