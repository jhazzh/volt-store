"use client";

import { useEffect, useState } from "react";

type State =
  | { status: "loading" }
  | { status: "done"; verdict: string }
  | { status: "empty" }; // no key, rate-limited, or model returned nothing

/**
 * Fetches the LLM "which should I pick" verdict for the compared products.
 * Client-side so the specs table stays static/ISR and only the verdict is
 * dynamic. Renders nothing when the verdict is unavailable.
 * @param {{ids: string[]}} props product ids being compared
 * @return {JSX.Element | null} verdict card, spinner, or nothing
 */
export function CompareVerdict({ ids }: { ids: string[] }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let active = true;
    fetch("/api/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active) return;
        const verdict: string | null = data?.verdict ?? null;
        setState(verdict ? { status: "done", verdict } : { status: "empty" });
      })
      .catch(() => active && setState({ status: "empty" }));
    return () => {
      active = false;
    };
  }, [ids]);

  if (state.status === "empty") return null;

  return (
    <section className="mx-auto mt-8 max-w-4xl px-4">
      <div className="rounded-lg border border-black/10 bg-black/[0.02] p-5 dark:border-white/15 dark:bg-white/5">
        <h2 className="mb-2 text-sm font-semibold text-black/60 dark:text-white/60">
          AI verdict
        </h2>
        {state.status === "loading" ? (
          <p className="animate-pulse text-sm text-black/40 dark:text-white/40">
            Weighing the options…
          </p>
        ) : (
          <p className="text-sm leading-relaxed">{state.verdict}</p>
        )}
      </div>
    </section>
  );
}
