import { headers } from "next/headers";
import { getProduct, getReviews } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { askProduct } from "@/lib/product-qa";

type Params = { params: Promise<{ slug: string }> };

/**
 * Stream an AI answer to a shopper's question about one product.
 * @param {Request} request POST body: { question: string }
 * @param {Params} ctx route params with the product slug
 * @return {Promise<Response>} streamed plain-text answer, or an error status
 */
export async function POST(request: Request, { params }: Params) {
  // One LLM call per hit — throttle per IP (10/min), same limiter as search.
  const ip =
    (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { data: allowed } = await createAdminClient().rpc("bump_rate_limit", {
    p_key: `ask:${ip}`,
    p_window: "1 minute",
    p_max: 10,
  });
  if (!allowed) {
    return Response.json({ error: "Too many questions" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const question =
    typeof body?.question === "string" ? body.question.trim() : "";
  if (question.length < 3 || question.length > 300) {
    return Response.json({ error: "Ask a short question." }, { status: 400 });
  }

  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) {
    return Response.json({ error: "Product not found" }, { status: 404 });
  }
  const reviews = await getReviews(product.id);

  const stream = await askProduct(question, { product, reviews });
  if (!stream) {
    return Response.json(
      { error: "The assistant is unavailable right now." },
      { status: 503 }
    );
  }

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
