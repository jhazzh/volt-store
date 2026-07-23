import { getCartUpsells } from "@/lib/data";
import type { Product } from "@/lib/types";

// The cart lives in localStorage, so the drawer (a client component) has to ask
// for suggestions at open time. No LLM call happens here — this reads the
// precomputed goes_well_with arrays, so it's a plain indexed lookup.

export type UpsellResult = {
  id: string;
  name: string;
  slug: string;
  price: number;
  image_url: string | null;
};

const MAX_CART_IDS = 50; // bounds the array we hand to Postgres
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Suggested add-ons for the given cart.
 * @param {Request} request GET /api/cart-upsells?ids=uuid,uuid
 * @return {Promise<Response>} { results: UpsellResult[] }
 */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("ids") ?? "";
  // Validate before querying: these go into a uuid[] param, and a malformed
  // value would make Postgres throw rather than return empty.
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => UUID_RE.test(s))
    .slice(0, MAX_CART_IDS);

  if (ids.length === 0) return Response.json({ results: [] });

  const products: Product[] = await getCartUpsells(ids);
  const results: UpsellResult[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: Number(p.price),
    image_url: p.image_url,
  }));

  return Response.json({ results });
}
