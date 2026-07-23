import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

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

/**
 * The text a product is embedded from. Must match scripts/embed-products.mjs,
 * or backfilled rows and saved rows land in different parts of the space.
 * @param {string} name product name
 * @param {string | null} description product description
 * @return {string} text to embed
 */
export function productEmbedText(name: string, description: string | null): string {
  return `${name}. ${description ?? ""}`.trim();
}

/**
 * Refresh one product's embedding. Fire-and-forget: a failure leaves the old
 * vector in place and is logged, never surfaced — saving a product must not
 * fail because the search index is down. Re-embed with `npm run embed`.
 * @param {string} id product id
 * @param {string} name product name
 * @param {string | null} description product description
 * @return {Promise<boolean>} true if the embedding was stored
 */
export async function embedProduct(
  id: string,
  name: string,
  description: string | null
): Promise<boolean> {
  const embedding = await embedText(productEmbedText(name, description));
  if (!embedding) {
    console.error(`embedProduct: embedding failed for ${id}`);
    return false;
  }

  // Admin client: this runs after the response, outside the user's session.
  const { error } = await createAdminClient()
    .from("products")
    .update({ embedding })
    .eq("id", id);
  if (error) {
    console.error(`embedProduct: write failed for ${id}: ${error.message}`);
    return false;
  }
  return true;
}
