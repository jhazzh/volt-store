import type { Metadata } from "next";
import { Filters } from "@/components/filters";
import { ProductCard } from "@/components/product-card";
import { getCategories, getProducts, type ProductFilters } from "@/lib/data";

export const metadata: Metadata = {
  title: "Products",
  description: "Browse all products — audio, wearables and accessories.",
};

type Props = {
  searchParams: Promise<{ category?: string; sort?: string; q?: string }>;
};

export default async function ProductsPage({ searchParams }: Props) {
  const params = await searchParams;
  const filters: ProductFilters = {
    category: params.category,
    sort: params.sort as ProductFilters["sort"],
    q: params.q,
  };

  const [products, categories] = await Promise.all([
    getProducts(filters),
    getCategories(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Products</h1>
        <Filters categories={categories} />
      </div>

      {products.length === 0 ? (
        <p className="py-16 text-center text-muted">No products match your filters.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p, i) => (
            // First row (max 4 cols) is above the fold — the LCP lives here.
            <ProductCard key={p.id} product={p} eager={i < 4} />
          ))}
        </div>
      )}
    </div>
  );
}
