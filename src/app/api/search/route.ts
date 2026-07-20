import { headers } from "next/headers";
import { searchProducts } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";

export type SearchResult = {
  type: "product"; // later: "post" | "page"
  id: string;
  title: string;
  href: string;
  price: number;
  image_url: string | null;
};

/**
 * Live search for the pop-up. One place to add more result types later.
 * @param {Request} request GET /api/search?q=...
 * @return {Promise<Response>} { results: SearchResult[] }
 */
export async function GET(request: Request) {
  // Unauthenticated + one DB query per hit — throttle per IP so it can't be
  // flooded (30/min, fixed window in the DB, same limiter as checkout).
  const ip =
    (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { data: allowed } = await createAdminClient().rpc("bump_rate_limit", {
    p_key: `search:${ip}`,
    p_window: "1 minute",
    p_max: 30,
  });
  if (!allowed) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return Response.json({ results: [] });

  // Same keyword + semantic merge the /products page uses, so the pop-up and
  // "See all results" never disagree.
  const products = await searchProducts({ q });

  const results: SearchResult[] = products.slice(0, 8).map((p) => ({
    type: "product",
    id: p.id,
    title: p.name,
    href: `/products/${p.slug}`,
    price: Number(p.price),
    image_url: p.image_url,
  }));

  return Response.json({ results });
}
