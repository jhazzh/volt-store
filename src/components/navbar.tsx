"use client";

import Link from "next/link";
import { useCart } from "@/components/cart/cart-context";
import { SearchDialog } from "@/components/search-dialog";
import { MobileMenu } from "@/components/mobile-menu";
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
        <div className="flex items-center gap-3 text-sm sm:gap-6">
          <SearchDialog />
          <Link href="/products" className="hidden hover:text-accent transition-colors sm:inline">
            Products
          </Link>
          <Link href="/account" className="hidden hover:text-accent transition-colors sm:inline">
            Account
          </Link>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={`Open cart, ${count} items`}
            className="relative rounded-md border border-border p-1.5 hover:border-accent transition-colors sm:px-3"
          >
            {/* Icon on mobile, text on desktop. */}
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden className="sm:hidden">
              <path
                d="M2 3h2l1.5 9h9l1.5-6H5M8 16.5a.5.5 0 11-1 0 .5.5 0 011 0zm7 0a.5.5 0 11-1 0 .5.5 0 011 0z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="hidden sm:inline">Cart</span>
            {count > 0 && (
              <span
                aria-hidden
                className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-semibold text-accent-foreground"
              >
                {count}
              </span>
            )}
          </button>
          <MobileMenu />
        </div>
      </nav>
    </header>
  );
}
