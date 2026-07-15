import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { getFeaturedProducts } from "@/lib/data";

export const revalidate = 3600;

export default async function HomePage() {
  let featured: Awaited<ReturnType<typeof getFeaturedProducts>> = [];
  try {
    featured = await getFeaturedProducts();
  } catch {
    // DB unreachable at build — section renders empty, ISR refills it
  }

  return (
    <div className="mx-auto max-w-6xl px-4">
      <section className="py-16 text-center sm:py-24">
        <h1 className="mx-auto max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
          Tech essentials, <span className="text-accent">done right</span>.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted">
          Audio, wearables and accessories — curated, fast to ship, and built to last.
        </p>
        <Link
          href="/products"
          className="mt-8 inline-block rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
        >
          Shop all products
        </Link>
      </section>

      <section className="pb-16">
        <h2 className="mb-6 text-xl font-semibold">New arrivals</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {featured.map((p, i) => (
            // First row (max 4 cols) is above the fold — the LCP lives here.
            <ProductCard key={p.id} product={p} eager={i < 4} />
          ))}
        </div>
      </section>
    </div>
  );
}
