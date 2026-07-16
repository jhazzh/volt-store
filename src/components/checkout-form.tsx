"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import {
  startCheckout,
  startPaypalCheckout,
  startXenditCheckout,
  type CheckoutState,
} from "@/app/checkout/actions";
import { useCart } from "@/components/cart/cart-context";
import { cartTotal } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { paymentMethods } from "@/lib/payments";

/**
 * Order summary + pay buttons — redirects to the chosen provider.
 * @param {boolean} guest no session — collect an email for the receipt
 * @return {JSX.Element} checkout form
 */
export function CheckoutForm({ guest }: { guest: boolean }) {
  const { items, loaded } = useCart();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Cart lives in localStorage, read post-mount; don't judge it empty too soon.
  if (!loaded) {
    return <p className="mt-6 text-muted">Loading your cart…</p>;
  }
  if (items.length === 0) {
    return <p className="mt-6 text-muted">Your cart is empty.</p>;
  }

  const submit = (
    action: (input: {
      items: { productId: string; qty: number }[];
      email?: string;
    }) => Promise<CheckoutState>,
  ) => {
    if (guest && !email.trim()) {
      setError("Email is required for guest checkout.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await action({
        items: items.map((i) => ({ productId: i.product.id, qty: i.qty })),
        email: guest ? email.trim() : undefined,
      });
      // Success redirects to the provider (cart cleared on the order page).
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

      {guest && (
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email for receipt"
          aria-label="Email for receipt"
          className="mt-6 w-full rounded-lg border border-border bg-transparent px-4 py-3 text-sm outline-none focus:border-accent"
        />
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-500">
          {error}
        </p>
      )}

      {paymentMethods.stripe && (
        <button
          type="button"
          onClick={() => submit(startCheckout)}
          disabled={pending}
          className="mt-6 w-full rounded-lg bg-accent py-3 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Redirecting…" : "Pay with card"}
        </button>
      )}
      {paymentMethods.paypal && (
        <button
          type="button"
          onClick={() => submit(startPaypalCheckout)}
          disabled={pending}
          className="mt-3 w-full rounded-lg border border-border py-3 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Redirecting…" : "Pay with PayPal"}
        </button>
      )}
      {paymentMethods.xendit && (
        <button
          type="button"
          onClick={() => submit(startXenditCheckout)}
          disabled={pending}
          className="mt-3 w-full rounded-lg border border-border py-3 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Redirecting…" : "Pay with QRIS / bank transfer"}
        </button>
      )}
      <p className="mt-2 text-center text-xs text-muted">
        Test mode —{" "}
        {[
          paymentMethods.stripe && "card 4242 4242 4242 4242",
          paymentMethods.paypal && "sandbox PayPal",
          paymentMethods.xendit && "simulated QRIS/VA",
        ]
          .filter(Boolean)
          .join(", or ")}
        .
      </p>
    </div>
  );
}
