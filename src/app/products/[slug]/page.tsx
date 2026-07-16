import type { Metadata } from "next";
import { ViewTransition } from "react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/add-to-cart";
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
        product.stock > 0
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
            {product.stock > 0 ? `${product.stock} in stock` : "Currently unavailable"}
          </p>
          <div className="mt-8 max-w-sm">
            <AddToCart product={product} />
          </div>
        </div>
      </div>
    </div>
  );
}
