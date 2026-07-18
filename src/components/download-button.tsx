"use client";

import { useState } from "react";

/**
 * Fetches a purchased item's delivery from /api/download/:id.
 * - file/url  -> the route redirects; we open it in a new tab.
 * - key/access -> the route returns JSON; we reveal the code inline.
 * @param {{ orderItemId: string; token?: string }} props Item + optional guest token
 */
export function DownloadButton({
  orderItemId,
  token,
}: {
  orderItemId: string;
  token?: string;
}) {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle() {
    setLoading(true);
    setError(null);
    try {
      const qs = token ? `?token=${encodeURIComponent(token)}` : "";
      const res = await fetch(`/api/download/${orderItemId}${qs}`);
      // Redirected file/url delivery: just open the final URL.
      if (res.redirected) {
        window.open(res.url, "_blank", "noopener");
        return;
      }
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { value: string };
      setCode(data.value); // key / access code
    } catch {
      setError("Unavailable. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (code)
    return <span className="font-mono text-xs text-accent">{code}</span>;

  return (
    <button
      onClick={handle}
      disabled={loading}
      className="rounded-md bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-50"
    >
      {loading ? "…" : error ?? "Download"}
    </button>
  );
}
