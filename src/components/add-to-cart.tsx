"use client";

import { useCart } from "@/components/cart/cart-context";
import type { Product } from "@/lib/types";

/**
 * @param {{product: Product}} props product
 * @return {JSX.Element} add-to-cart button
 */
export function AddToCart({ product }: { product: Product }) {
  const { dispatch, setOpen } = useCart();
  const out = product.stock === 0;

  return (
    <button
      type="button"
      disabled={out}
      onClick={() => {
        dispatch({
          type: "add",
          item: {
            product: {
              id: product.id,
              name: product.name,
              slug: product.slug,
              price: product.price,
              image_url: product.image_url,
            },
            qty: 1,
          },
        });
        setOpen(true);
      }}
      className="w-full rounded-lg bg-accent py-3 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-border disabled:text-muted"
    >
      {out ? "Out of stock" : "Add to cart"}
    </button>
  );
}
