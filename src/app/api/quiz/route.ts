import { headers } from "next/headers";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { recommendQuiz, QUIZ_QUESTIONS } from "@/lib/quiz";

const Body = z.object({
  answers: z
    .array(z.object({ id: z.string(), choice: z.string().max(80) }))
    .min(1)
    .max(QUIZ_QUESTIONS.length),
});

/**
 * "Is this right for me?" quiz. Takes the shopper's answers, matches products
 * semantically, and streams an AI recommendation. The matched products are
 * sent first as one JSON line, then the pitch streams as plain text after a
 * newline delimiter.
 * @param {Request} request POST { answers: {id, choice}[] }
 * @return {Promise<Response>} JSON line + newline + streamed pitch
 */
export async function POST(request: Request) {
  // One LLM call per hit — throttle per IP, same limiter as ask/compare.
  const ip =
    (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { data: allowed } = await createAdminClient().rpc("bump_rate_limit", {
    p_key: `quiz:${ip}`,
    p_window: "1 minute",
    p_max: 10,
  });
  if (!allowed) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const { products, pitch } = await recommendQuiz(parsed.data.answers);
  if (products.length === 0) {
    return Response.json(
      { error: "No matching products found." },
      { status: 404 }
    );
  }

  // First line: matched products for the cards. Then the streamed pitch.
  const cards = products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: Number(p.price),
    image_url: p.image_url,
  }));
  const encoder = new TextEncoder();
  const header = encoder.encode(JSON.stringify({ products: cards }) + "\n");

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(header);
      if (pitch) {
        const reader = pitch.getReader();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
