"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useCart } from "@/components/cart/cart-context";
import { formatPrice } from "@/lib/format";
import type { UpsellResult } from "@/app/api/cart-upsells/route";

/**
 * "Goes well with" suggestions for the current cart. Complements are picked by
 * an LLM offline (see scripts/pair-products.mjs), so this is just a lookup —
 * no model call on the cart view.
 * @return {JSX.Element | null} suggestions, or null when there are none
 */
export function CartUpsells() {
  const { items, dispatch } = useCart();
  const [suggestions, setSuggestions] = useState<UpsellResult[]>([]);

  // Sorted + joined so the key is stable regardless of the order items were
  // added — reordering the cart shouldn't refetch.
  const cartKey = items
    .map((i) => i.product.id)
    .sort()
    .join(",");

  useEffect(() => {
    if (!cartKey) return; // empty cart — the drawer doesn't render us anyway
    // Ignore a resolved response if the cart changed while it was in flight.
    let active = true;
    fetch(`/api/cart-upsells?ids=${cartKey}`)
      .then((r) => (r.ok ? r.json() : { results: [] }))
      .then((d) => {
        if (active) setSuggestions(d.results ?? []);
      })
      .catch(() => {
        if (active) setSuggestions([]);
      });
    return () => {
      active = false;
    };
  }, [cartKey]);

  // Drop anything the shopper added since the fetch resolved, so a suggestion
  // never lingers next to the same product now sitting in the cart.
  const inCart = new Set(items.map((i) => i.product.id));
  const visible = suggestions.filter((s) => !inCart.has(s.id));

  if (visible.length === 0) return null;

  return (
    <section className="border-t border-border pt-4" aria-label="Suggested add-ons">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
        Goes well with
      </h3>
      <ul className="mt-3 space-y-3">
        {visible.map((s) => (
          <li key={s.id} className="flex items-center gap-3">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-card">
              {s.image_url && (
                <Image
                  src={s.image_url}
                  alt={s.name}
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{s.name}</p>
              <p className="text-xs text-muted">{formatPrice(s.price)}</p>
            </div>
            <button
              type="button"
              aria-label={`Add ${s.name} to cart`}
              onClick={() =>
                dispatch({
                  type: "add",
                  item: {
                    product: {
                      id: s.id,
                      name: s.name,
                      slug: s.slug,
                      price: s.price,
                      image_url: s.image_url,
                    },
                    qty: 1,
                  },
                })
              }
              className="shrink-0 rounded-md border border-border px-2 py-1 text-xs hover:border-accent"
            >
              Add
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
