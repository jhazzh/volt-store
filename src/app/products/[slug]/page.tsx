import type { Metadata } from "next";
import { ViewTransition, Suspense } from "react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/add-to-cart";
import { ReviewsSection } from "@/components/reviews-section";
import { getProduct, getProducts } from "@/lib/data";
import { formatPrice } from "@/lib/format";

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  try {
    const products = await getProducts();
    return products.map((p) => ({ slug: p.slug }));
  } catch {
    return []; // DB unreachable at build — pages render on demand
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return {};
  return {
    title: product.name,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: product.image_url ? [product.image_url] : [],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.image_url ?? undefined,
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "USD",
      availability:
        product.stock === null || product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* JSON-LD: own-DB JSON only; `<` escaped to block script breakout */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <div className="grid gap-8 md:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-xl bg-card">
          {product.image_url && (
            <ViewTransition name={`product-image-${product.id}`} share="morph">
              <Image
                src={product.image_url}
                alt={product.name}
                fill
                loading="eager"
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
            </ViewTransition>
          )}
        </div>
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <p className="mt-2 text-2xl font-semibold text-accent">
            {formatPrice(product.price)}
          </p>
          <p className="mt-4 leading-relaxed text-muted">{product.description}</p>
          <p className="mt-4 text-sm text-muted">
            {product.stock === null
              ? "Instant digital delivery"
              : product.stock > 0
                ? `${product.stock} in stock`
                : "Currently unavailable"}
          </p>
          {product.specs && product.specs.length > 0 && (
            <dl className="mt-6 divide-y divide-border border-t border-border text-sm">
              {product.specs.map((spec, i) => (
                <div key={i} className="flex justify-between gap-4 py-2">
                  <dt className="text-muted">{spec.key}</dt>
                  <dd className="text-right font-medium">{spec.value}</dd>
                </div>
              ))}
            </dl>
          )}
          <div className="mt-8 max-w-sm">
            <AddToCart product={product} />
          </div>
        </div>
      </div>

      {/* Reviews read cookies (auth) — stream them so the product shell above
          stays static/ISR. */}
      <Suspense
        fallback={
          <p className="mx-auto mt-14 max-w-6xl px-4 text-sm text-muted">
            Loading reviews…
          </p>
        }
      >
        <ReviewsSection product={product} slug={slug} />
      </Suspense>
    </div>
  );
}
