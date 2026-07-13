"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { placeOrder } from "@/app/checkout/actions";
import { useCart } from "@/components/cart/cart-context";
import { cartTotal } from "@/lib/cart";
import { formatPrice } from "@/lib/format";

/**
 * Order summary + place-order (demo: no real payment).
 * @return {JSX.Element} checkout form
 */
export function CheckoutForm() {
  const { items } = useCart();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (items.length === 0) {
    return <p className="mt-6 text-muted">Your cart is empty.</p>;
  }

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await placeOrder({
        items: items.map((i) => ({ productId: i.product.id, qty: i.qty })),
      });
      // Success redirects server-side (cart cleared on the order page).
      if (result?.error) setError(result.error);
    });
  };

  return (
    <div className="mt-6">
      <ul className="space-y-3">
        {items.map(({ product, qty }) => (
          <li key={product.id} className="flex items-center gap-3">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-card">
              {product.image_url && (
                <Image
                  src={product.image_url}
                  alt={product.name}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              )}
            </div>
            <span className="flex-1 text-sm">
              {product.name} × {qty}
            </span>
            <span className="text-sm font-medium">
              {formatPrice(product.price * qty)}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex justify-between border-t border-border pt-4 font-semibold">
        <span>Total</span>
        <span>{formatPrice(cartTotal(items))}</span>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-500">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="mt-6 w-full rounded-lg bg-accent py-3 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Placing order…" : "Place order (demo)"}
      </button>
      <p className="mt-2 text-center text-xs text-muted">
        Demo checkout — no payment is taken. Login required.
      </p>
    </div>
  );
}
