"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import type { SearchResult } from "@/app/api/search/route";
import { formatPrice } from "@/lib/format";

const emptySubscribe = () => () => {};

/**
 * @return {JSX.Element} navbar search trigger + pop-up (Ctrl/⌘+K)
 */
export function SearchDialog() {
  const [open, setOpen] = useState(false);
  // Portal target exists only after mount (SSR-safe).
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
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
        aria-label="Search (Ctrl+K)"
        className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-muted hover:border-accent transition-colors"
      >
        Search
        <kbd className="rounded border border-border px-1 text-xs">⌘K</kbd>
      </button>

      {/* Portaled out of the header: its backdrop-blur re-anchors fixed children to itself. */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {/* Panel unmounts on close, so query/results reset for the next open. */}
            {open && <SearchPanel close={() => setOpen(false)} />}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}

function SearchPanel({ close }: { close: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  // Results tagged with the query they answer; a mismatch with `q` = loading.
  const [done, setDone] = useState<{ q: string; results: SearchResult[] }>({
    q: "",
    results: [],
  });
  const inputRef = useRef<HTMLInputElement>(null);
  // Element focused before open, so we can restore focus on close.
  const restoreRef = useRef<HTMLElement | null>(null);

  const query = q.trim();
  const loading = query.length >= 2 && done.q !== query;
  const results = done.q === query ? done.results : [];

  useEffect(() => {
    restoreRef.current = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    return () => restoreRef.current?.focus();
  }, []);

  // Debounced live search; abort stale requests.
  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        setDone({ q: query, results: data.results });
      } catch {
        /* aborted or offline — keep previous results */
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  const submit = () => {
    if (!query) return;
    close();
    router.push(`/products?q=${encodeURIComponent(query)}`);
  };

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
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.15 }}
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        className="fixed left-1/2 top-24 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 rounded-xl border border-border bg-background shadow-xl"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <input
            ref={inputRef}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products…"
            aria-label="Search products"
            className="w-full rounded-t-xl border-b border-border bg-transparent px-4 py-3 text-sm outline-none"
          />
        </form>

        {query.length >= 2 && (
          <ul className="max-h-80 overflow-y-auto p-2">
            {loading && (
              <li
                role="status"
                aria-label="Searching"
                className="flex items-center gap-1.5 px-2 py-3"
              >
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" />
              </li>
            )}
            {!loading && results.length === 0 && (
              <li className="px-2 py-3 text-sm text-muted">No results.</li>
            )}
            {results.map((r) => (
              <li key={r.id}>
                <Link
                  href={r.href}
                  onClick={close}
                  className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-card"
                >
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-card">
                    {r.image_url && (
                      <Image
                        src={r.image_url}
                        alt=""
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <span className="flex-1 text-sm">{r.title}</span>
                  <span className="text-sm text-muted">
                    {formatPrice(r.price)}
                  </span>
                </Link>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={submit}
                className="w-full rounded-md px-2 py-2 text-left text-sm text-accent hover:bg-card"
              >
                See all results for “{query}”
              </button>
            </li>
          </ul>
        )}
      </motion.div>
    </>
  );
}
