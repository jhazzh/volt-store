"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useCart } from "@/components/cart/cart-context";
import { cartTotal } from "@/lib/cart";
import { formatPrice } from "@/lib/format";

/**
 * @return {JSX.Element} slide-in cart panel
 */
export function CartDrawer() {
  const { items, dispatch, isOpen, setOpen } = useCart();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-50 bg-black/50"
            aria-hidden
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.25 }}
            role="dialog"
            aria-label="Shopping cart"
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col border-l border-border bg-background p-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Your cart</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close cart"
                className="rounded-md border border-border px-2 py-1 text-sm hover:border-accent"
              >
                ✕
              </button>
            </div>

            <ul className="mt-4 flex-1 space-y-4 overflow-y-auto">
              {items.length === 0 && (
                <li className="text-sm text-muted">Your cart is empty.</li>
              )}
              {items.map(({ product, qty }) => (
                <li key={product.id} className="flex gap-3">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-card">
                    {product.image_url && (
                      <Image
                        src={product.image_url}
                        alt={product.name}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{product.name}</p>
                    <p className="text-sm text-muted">{formatPrice(product.price)}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <button
                        type="button"
                        aria-label={`Decrease ${product.name} quantity`}
                        onClick={() =>
                          dispatch({ type: "setQty", productId: product.id, qty: qty - 1 })
                        }
                        className="h-6 w-6 rounded border border-border text-sm hover:border-accent"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm">{qty}</span>
                      <button
                        type="button"
                        aria-label={`Increase ${product.name} quantity`}
                        onClick={() =>
                          dispatch({ type: "setQty", productId: product.id, qty: qty + 1 })
                        }
                        className="h-6 w-6 rounded border border-border text-sm hover:border-accent"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => dispatch({ type: "remove", productId: product.id })}
                        className="ml-auto text-xs text-muted underline hover:text-accent"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-t border-border pt-4">
              <div className="flex justify-between text-sm">
                <span>Total</span>
                <span className="font-semibold">{formatPrice(cartTotal(items))}</span>
              </div>
              <Link
                href="/checkout"
                onClick={() => setOpen(false)}
                aria-disabled={items.length === 0}
                className={`mt-3 block rounded-lg py-2.5 text-center text-sm font-semibold transition-colors ${
                  items.length === 0
                    ? "pointer-events-none bg-border text-muted"
                    : "bg-accent text-accent-foreground hover:opacity-90"
                }`}
              >
                Checkout
              </Link>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
