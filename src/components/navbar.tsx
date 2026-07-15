"use client";

import Link from "next/link";
import { useCart } from "@/components/cart/cart-context";
import { cartCount } from "@/lib/cart";

/**
 * @return {JSX.Element} sticky top navigation
 */
export function Navbar() {
  const { items, setOpen } = useCart();
  const count = cartCount(items);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <nav
        aria-label="Main"
        className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4"
      >
        <Link href="/" className="text-lg font-bold tracking-tight">
          Volt<span className="text-accent">Store</span>
        </Link>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/products" className="hover:text-accent transition-colors">
            Products
          </Link>
          <Link href="/account" className="hover:text-accent transition-colors">
            Account
          </Link>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={`Open cart, ${count} items`}
            className="relative rounded-md border border-border px-3 py-1.5 hover:border-accent transition-colors"
          >
            Cart
            {count > 0 && (
              <span
                aria-hidden
                className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-semibold text-accent-foreground"
              >
                {count}
              </span>
            )}
          </button>
        </div>
      </nav>
    </header>
  );
}
