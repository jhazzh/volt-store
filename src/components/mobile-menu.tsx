"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";

const emptySubscribe = () => () => {};

const links = [
  { href: "/products", label: "Products" },
  { href: "/account", label: "Account" },
];

/**
 * @return {JSX.Element} navbar hamburger trigger + slide-in menu (mobile only)
 */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-haspopup="dialog"
        className="rounded-md border border-border p-1.5 hover:border-accent transition-colors sm:hidden"
      >
        {/* Hamburger icon */}
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
          <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {/* Portaled out of the header: its backdrop-blur re-anchors fixed children. */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && <MenuPanel close={() => setOpen(false)} />}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}

function MenuPanel({ close }: { close: () => void }) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={close}
        className="fixed inset-0 z-50 bg-black/50"
        aria-hidden
      />
      <motion.nav
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 16 }}
        transition={{ duration: 0.15 }}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className="fixed right-0 top-0 z-50 flex h-full w-64 max-w-[80%] flex-col gap-1 border-l border-border bg-background p-4 shadow-xl"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close menu"
          className="mb-2 self-end rounded-md p-1.5 text-muted hover:text-foreground"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            onClick={close}
            className="rounded-md px-3 py-2 text-sm hover:bg-card hover:text-accent transition-colors"
          >
            {l.label}
          </Link>
        ))}
      </motion.nav>
    </>
  );
}
