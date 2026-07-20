import "server-only";

/**
 * Embed text via the `embed` Edge Function (gte-small, 384 dims).
 * Returns null on any failure so callers can fall back to keyword search —
 * search must never break because embedding is down.
 * @param {string} text text to embed
 * @return {Promise<number[] | null>} 384-dim vector, or null on failure
 */
export async function embedText(text: string): Promise<number[] | null> {
  const q = text.trim();
  if (!q) return null;

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/embed`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
        },
        body: JSON.stringify({ text: q }),
        signal: AbortSignal.timeout(5000),
      }
    );
    if (!res.ok) return null;
    const { embedding } = await res.json();
    return Array.isArray(embedding) ? embedding : null;
  } catch {
    return null;
  }
}
