"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, useTransition } from "react";

/**
 * Min/Max price filter for the facet sidebar. Self-contained: reads/writes the
 * minPrice/maxPrice URL params directly. Debounced so typing doesn't push a
 * route per keystroke; remounts on external URL change to re-init the inputs.
 * @return {JSX.Element} the price range control
 */
export function PriceRange() {
  const params = useSearchParams();
  const min = params.get("minPrice") ?? "";
  const max = params.get("maxPrice") ?? "";
  // Remount on external change (back/forward, clearing filters) so the inputs
  // re-init from the URL without a setState-in-effect sync.
  return <PriceRangeInner key={`${min}|${max}`} min={min} max={max} />;
}

function PriceRangeInner({ min, max }: { min: string; max: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const [lo, setLo] = useState(min);
  const [hi, setHi] = useState(max);

  // Debounce: push to the URL 400ms after the last keystroke.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const push = (key: string, value: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      startTransition(() => router.push(`${pathname}?${next.toString()}`));
    }, 400);
  };

  const field =
    "w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm";

  return (
    <div>
      <h3 className="mb-2 font-semibold">Price</h3>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          inputMode="numeric"
          placeholder="Min"
          value={lo}
          onChange={(e) => {
            setLo(e.target.value);
            push("minPrice", e.target.value);
          }}
          className={field}
          aria-label="Minimum price"
        />
        <span className="text-muted">–</span>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          placeholder="Max"
          value={hi}
          onChange={(e) => {
            setHi(e.target.value);
            push("maxPrice", e.target.value);
          }}
          className={field}
          aria-label="Maximum price"
        />
      </div>
    </div>
  );
}
