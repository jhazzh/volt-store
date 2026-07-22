import { CompareBar } from "@/components/compare/compare-bar";
import { ProductCard } from "@/components/product-card";
import { getRelatedProducts } from "@/lib/data";

/**
 * "More like this" — semantically nearest products. Renders nothing when there
 * are none (unembedded catalog or too few products).
 * @param {{id: string}} props source product id
 * @return {Promise<JSX.Element | null>} related grid
 */
export async function RelatedProducts({ id }: { id: string }) {
  const products = await getRelatedProducts(id);
  if (products.length === 0) return null;

  return (
    <section className="mx-auto mt-14 max-w-6xl px-4">
      <h2 className="mb-6 text-lg font-semibold">More like this</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      <CompareBar />
    </section>
  );
}
