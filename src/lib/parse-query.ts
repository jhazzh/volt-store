import "server-only";

import { callLLM, llmEnabled } from "@/lib/llm";

export type ParsedQuery = {
  // What to embed for semantic search — the descriptive part, prices stripped.
  q: string;
  minPrice?: number;
  maxPrice?: number;
  category?: string;
  sort?: "price-asc" | "price-desc";
};

const SYSTEM_PROMPT =
  "Turn a shopper's search into JSON filters. Output ONLY: " +
  '{"q":string,"minPrice"?:number,"maxPrice"?:number,"category"?:string,' +
  '"sort"?:"price-asc"|"price-desc"}. q = the query with price/category words ' +
  'removed (e.g. "a quiet gift under $50" -> "quiet gift"). category = one from ' +
  "the list, loose match. sort only if they ask cheapest/most expensive. Omit " +
  "unsure fields. No prose.";

// Cheap pre-check: only worth an LLM call when the text hints at a price,
// number, or sort — plain keyword searches skip it and save the rate limit.
const FILTER_HINT =
  /\d|\bunder\b|\bover\b|\bbelow\b|\babove\b|\bless\b|\bmore\b|\bcheap|\bexpensive|\bbudget\b|\baffordable\b|\$|£|€|\bprice\b/i;

/**
 * Whether the text looks like it carries a price/number/sort filter.
 * @param {string} text the shopper's search sentence
 * @return {boolean} true if an LLM parse is worthwhile
 */
export function hasFilterHint(text: string): boolean {
  return FILTER_HINT.test(text);
}

// Identical searches parse identically, so cache to skip the LLM (and its rate
// limit) on repeats. Bounded LRU-ish: oldest key evicted past the cap.
const CACHE_MAX = 500;
const cache = new Map<string, ParsedQuery>();

function cacheGet(k: string): ParsedQuery | undefined {
  const v = cache.get(k);
  if (v) {
    cache.delete(k); // re-insert to mark as recently used
    cache.set(k, v);
  }
  return v;
}

function cacheSet(k: string, v: ParsedQuery): void {
  cache.set(k, v);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value!);
}

/**
 * Parse a natural-language query into structured filters via the LLM.
 * Falls back to the raw text as `q` (no filters) when the key is unset or the
 * call fails, so search never breaks because parsing is down.
 * @param {string} text the shopper's search sentence
 * @param {string[]} categories valid category slugs to constrain `category`
 * @return {Promise<ParsedQuery>} filters, always with at least `q`
 */
export async function parseQuery(
  text: string,
  categories: string[]
): Promise<ParsedQuery> {
  const raw = text.trim();
  if (!llmEnabled() || !raw) return { q: raw };

  // Category list is part of the key: same text can parse differently if the
  // available categories change.
  const cacheKey = `${categories.join(",")}\n${raw.toLowerCase()}`;
  const hit = cacheGet(cacheKey);
  if (hit) return hit;

  try {
    const res = await callLLM(
      {
        max_tokens: 80,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Categories: ${categories.join(", ")}\n\nSearch: ${raw}`,
          },
        ],
      },
      AbortSignal.timeout(5000)
    );
    if (!res?.ok) return { q: raw };

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    const parsed = normalize(content, raw, categories);
    cacheSet(cacheKey, parsed);
    return parsed;
  } catch {
    return { q: raw };
  }
}

/**
 * Validate the model's JSON, dropping anything malformed or out of range.
 * @param {unknown} content raw JSON string from the model
 * @param {string} raw original query, used as the `q` fallback
 * @param {string[]} categories allowed category slugs
 * @return {ParsedQuery} clean filters
 */
export function normalize(
  content: unknown,
  raw: string,
  categories: string[]
): ParsedQuery {
  let obj: Record<string, unknown> = {};
  try {
    if (typeof content === "string") obj = JSON.parse(content);
  } catch {
    return { q: raw };
  }

  const num = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : undefined;

  const q = typeof obj.q === "string" && obj.q.trim() ? obj.q.trim() : raw;
  const category =
    typeof obj.category === "string" && categories.includes(obj.category)
      ? obj.category
      : undefined;
  const sort =
    obj.sort === "price-asc" || obj.sort === "price-desc" ? obj.sort : undefined;

  return { q, minPrice: num(obj.minPrice), maxPrice: num(obj.maxPrice), category, sort };
}
