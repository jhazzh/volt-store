import "server-only";
import { callLLM, llmEnabled } from "@/lib/llm";

// How many complements we store per product.
export const PAIR_COUNT = 3;
// Candidate pool size handed to the LLM. Big enough that accessories — which
// sit well down the similarity ranking — still make the list.
export const CANDIDATE_COUNT = 25;

const SYSTEM_PROMPT =
  "You pick complementary products for an online store. Given one product and " +
  "a numbered candidate list, choose up to " +
  PAIR_COUNT +
  " candidates a shopper buying the product would plausibly add to the same " +
  "order — accessories, consumables, or things used together.\n\n" +
  "Apply this test to every candidate: would someone buy it IN ADDITION TO " +
  "the product, on the same day? If they'd buy it INSTEAD, it's a substitute " +
  "— reject it. Two headphones are substitutes. Headphones and a case are " +
  "complements.\n\n" +
  "Most candidate lists contain no true complement at all, because the list " +
  "is built by similarity and similar things are usually substitutes. That " +
  "is the normal case and an empty list is the correct answer for it. Never " +
  "pad the list to reach " +
  PAIR_COUNT +
  ". One good pick beats three weak ones; zero beats one bad one.\n\n" +
  'Reply only as JSON: {"picks":[<numbers>]}, best first, using the ' +
  "candidates' numbers.";

/** A product the LLM may choose from. */
export type Candidate = { id: string; name: string; category?: string | null };

/**
 * Pick complementary products for one product, best first.
 * Returns [] when the LLM is unconfigured, the call fails, or nothing fits —
 * an empty array is a valid answer, so callers store it as-is.
 * @param {string} productName the product being paired
 * @param {Candidate[]} candidates pool to choose from
 * @return {Promise<string[]>} chosen candidate ids, up to PAIR_COUNT
 */
export async function pickComplements(
  productName: string,
  candidates: Candidate[]
): Promise<string[]> {
  if (!llmEnabled() || candidates.length === 0) return [];

  // 1-based numbering: the model handles small integers far more reliably than
  // it echoes back uuids, and it removes any chance of an invented id.
  const list = candidates
    .map((c, i) => `${i + 1}. ${c.name}${c.category ? ` (${c.category})` : ""}`)
    .join("\n");

  const res = await callLLM({
    // Generous: with response_format json_object the model must finish the
    // document, and truncation is a hard 400 (json_validate_failed), not a
    // short answer. The reply is only ~20 tokens; the headroom is free.
    max_tokens: 400,
    temperature: 0.2, // near-deterministic: pairings should be stable across runs
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Product: ${productName}\n\nCandidates:\n${list}` },
    ],
  });

  if (!res?.ok) return []; // rate limited / transient — leave the row unpaired
  const data = await res.json();
  const text: string | undefined = data?.choices?.[0]?.message?.content;
  if (!text) return [];

  return parsePicks(text, candidates);
}

/**
 * Turn the model's JSON reply into candidate ids, dropping anything malformed,
 * out of range, or duplicated. Exported for tests.
 * @param {string} text raw model reply
 * @param {Candidate[]} candidates the pool the numbers index into
 * @return {string[]} valid ids, capped at PAIR_COUNT
 */
export function parsePicks(text: string, candidates: Candidate[]): string[] {
  let picks: unknown;
  try {
    picks = JSON.parse(text)?.picks;
  } catch {
    return []; // not JSON despite response_format — treat as "no picks"
  }
  if (!Array.isArray(picks)) return [];

  const ids: string[] = [];
  for (const n of picks) {
    const i = Number(n) - 1; // replies are 1-based
    const c = candidates[i];
    if (!Number.isInteger(i) || !c || ids.includes(c.id)) continue;
    ids.push(c.id);
    if (ids.length === PAIR_COUNT) break;
  }
  return ids;
}
