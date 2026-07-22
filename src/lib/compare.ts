import "server-only";
import { COMPARE_MAX, COMPARE_MIN } from "@/lib/compare-limits";
import { callLLM, llmEnabled } from "@/lib/llm";
import type { Product } from "@/lib/types";

// Re-export so server callers keep importing limits from here.
export { COMPARE_MAX, COMPARE_MIN };

const SYSTEM_PROMPT =
  "You help a shopper choose between products in an online store. Given each " +
  "product's name, price, and specs, write a short, fair verdict: 2-3 plain " +
  "sentences saying which suits which kind of shopper and why. Ground every " +
  "claim in the specs or price given — never invent details. No headings, no " +
  "bullet points, and don't just declare one 'the best' overall.";

/** Compact one product into the lines the LLM reasons over. */
function describe(p: Product): string {
  const specs = (p.specs ?? [])
    .map((s) => `${s.key}: ${s.value}`)
    .join("; ");
  return [`Name: ${p.name}`, `Price: $${p.price}`, specs && `Specs: ${specs}`]
    .filter(Boolean)
    .join("\n");
}

/**
 * Write a fair "which should I pick" verdict comparing 2-4 products.
 * Returns null if the API key is unset (dev without credentials) or the call
 * fails, so the page can show the specs table without the verdict.
 * @param {Product[]} products the products being compared
 * @return {Promise<string | null>} verdict text, or null when disabled/failed
 */
export async function compareProducts(
  products: Product[]
): Promise<string | null> {
  if (!llmEnabled() || products.length < COMPARE_MIN) return null;

  const body = products
    .slice(0, COMPARE_MAX)
    .map((p, i) => `Product ${i + 1}\n${describe(p)}`)
    .join("\n\n");

  const res = await callLLM({
    max_tokens: 300,
    temperature: 0.4,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: body },
    ],
  });

  if (!res?.ok) return null; // rate limited / transient
  const data = await res.json();
  const text: string | undefined = data?.choices?.[0]?.message?.content;
  return text?.trim() ?? null;
}
