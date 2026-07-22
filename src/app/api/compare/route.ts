import { headers } from "next/headers";
import { z } from "zod";
import { compareProducts, COMPARE_MAX, COMPARE_MIN } from "@/lib/compare";
import { getProductsByIds } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";

const Body = z.object({
  ids: z.array(z.uuid()).min(COMPARE_MIN).max(COMPARE_MAX),
});

/**
 * LLM verdict comparing 2-4 products. Client sends the selected ids.
 * @param {Request} request POST /api/compare { ids: string[] }
 * @return {Promise<Response>} { verdict: string | null }
 */
export async function POST(request: Request) {
  // One LLM call per hit — throttle per IP, same limiter as search/checkout.
  const ip =
    (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { data: allowed } = await createAdminClient().rpc("bump_rate_limit", {
    p_key: `compare:${ip}`,
    p_window: "1 minute",
    p_max: 15,
  });
  if (!allowed) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const products = await getProductsByIds(parsed.data.ids);
  if (products.length < COMPARE_MIN) {
    return Response.json({ error: "Not enough products" }, { status: 400 });
  }

  const verdict = await compareProducts(products);
  return Response.json({ verdict });
}
