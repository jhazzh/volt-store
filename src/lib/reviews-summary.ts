import "server-only";
import { GROQ_MODEL, GROQ_URL } from "@/lib/groq";
import type { Review } from "@/lib/types";

// Regenerate the cached summary only after this many new reviews accumulate,
// so we call the LLM once per batch instead of once per submission.
export const SUMMARY_REFRESH_EVERY = 5;
// Below this, a summary adds nothing over just showing the reviews.
export const SUMMARY_MIN_REVIEWS = 3;

const SYSTEM_PROMPT =
  "You summarize customer reviews for an online store. Write 2-3 plain " +
  "sentences a shopper can skim: the overall sentiment, then the praise and " +
  "complaints that come up most. Neutral and factual — never invent details " +
  "not present in the reviews, and never address the reader.";

/**
 * Whether the cached summary is stale enough to regenerate.
 * @param {number} total current review count
 * @param {number} summarizedAt review count when the summary was last built
 * @return {boolean} true if we should call the LLM
 */
export function needsSummary(total: number, summarizedAt: number): boolean {
  return (
    total >= SUMMARY_MIN_REVIEWS &&
    total - summarizedAt >= SUMMARY_REFRESH_EVERY
  );
}

/**
 * Summarize a product's reviews into 2-3 sentences of shopper-facing prose.
 * Returns null if the API key is unset (dev without credentials) or the call
 * fails, so callers can skip the update gracefully.
 * @param {string} productName product name for context
 * @param {Review[]} reviews reviews to summarize (newest first is fine)
 * @return {Promise<string | null>} summary text, or null when disabled/failed
 */
export async function summarizeReviews(
  productName: string,
  reviews: Review[]
): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;

  // Cap input so a product with thousands of reviews can't blow up the prompt;
  // the newest reviews are the most representative.
  const sample = reviews
    .slice(0, 100)
    .map((r) => `[${r.rating}/5] ${r.body}`.trim())
    .join("\n");

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      max_tokens: 300,
      temperature: 0.3,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Product: ${productName}\n\nReviews:\n${sample}`,
        },
      ],
    }),
  });

  if (!res.ok) return null; // rate limited / transient — keep the old summary
  const data = await res.json();
  const text: string | undefined = data?.choices?.[0]?.message?.content;
  return text?.trim() ?? null;
}
