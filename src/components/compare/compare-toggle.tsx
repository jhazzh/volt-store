"use client";

import { useCompare } from "@/components/compare/compare-context";

/**
 * Checkbox overlay for a product card. Only visible when compare mode is on.
 * Sits inside the card's <Link>, so it stops clicks from navigating.
 * @param {{id: string, name: string}} props product id + name for a11y label
 * @return {JSX.Element | null} toggle, or nothing when hidden
 */
export function CompareToggle({ id, name }: { id: string; name: string }) {
  const { has, toggle, full, mode, loaded } = useCompare();
  if (!loaded || !mode) return null; // hidden until mode is on (and hydrated)

  const checked = has(id);
  const disabled = full && !checked;

  return (
    <label
      // Stop the click from reaching the parent card <Link> (navigation) without
      // preventing the checkbox's own toggle.
      onClick={(e) => e.stopPropagation()}
      className={`absolute left-2 top-2 z-10 flex items-center gap-1 rounded-md bg-background/90 px-2 py-1 text-xs backdrop-blur transition-opacity ${
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={() => toggle(id)}
        aria-label={`Compare ${name}`}
        className="accent-accent"
      />
      Compare
    </label>
  );
}
