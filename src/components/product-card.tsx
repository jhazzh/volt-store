import { ViewTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";

/**
 * @param {{product: Product, eager?: boolean}} props product; eager for above-the-fold cards
 * @return {JSX.Element} PLP/home card
 */
export function ProductCard({
  product,
  eager = false,
}: {
  product: Product;
  eager?: boolean;
}) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group rounded-xl border border-border bg-card p-3 transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-lg"
    >
      <div className="relative aspect-square overflow-hidden rounded-lg bg-border">
        {product.image_url && (
          <ViewTransition name={`product-image-${product.id}`} share="morph">
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              priority={eager}
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </ViewTransition>
        )}
      </div>
      <div className="mt-3 flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium">{product.name}</h3>
        <p className="text-sm font-semibold text-accent">{formatPrice(product.price)}</p>
      </div>
      {product.stock === 0 && (
        <p className="mt-1 text-xs text-muted">Out of stock</p>
      )}
    </Link>
  );
}
