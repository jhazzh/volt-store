import "server-only";

// Shared LLM config + call wrapper for all AI features (summaries, descriptions,
// Q&A, compare, query parsing, review tags). One place to add or swap providers.

// Providers tried in order. Groq is primary (free, fast); Gemini is used only
// when Groq is rate-limited (429). Both speak the OpenAI-compatible API, so the
// same request body works for each — only url/model/key differ.
type Provider = { url: string; model: string; key?: string };

// Read keys per call, not at module load, so env changes (and tests that stub
// env) take effect. Providers with no key are dropped from the chain.
function chain(): Provider[] {
  return [
    {
      url: "https://api.groq.com/openai/v1/chat/completions",
      model: "llama-3.3-70b-versatile",
      key: process.env.GROQ_API_KEY,
    },
    {
      url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      // *-latest tracks a model with live free-tier quota; pinned 2.0-flash was
      // zeroed to limit:0 for free tier.
      model: "gemini-flash-latest",
      key: process.env.GEMINI_API_KEY,
    },
  ].filter((p) => p.key);
}

/**
 * Whether any provider is configured — lets callers skip work in dev with no
 * credentials, matching the old `if (!process.env.GROQ_API_KEY)` guards.
 * @return {boolean} true if at least one provider has a key
 */
export function llmEnabled(): boolean {
  return chain().length > 0;
}

/** OpenAI-style chat payload, minus `model` (the wrapper fills it per provider). */
export type LLMPayload = {
  messages: { role: string; content: string }[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
  response_format?: { type: string };
};

/**
 * Call the LLM, falling back down the provider chain only on rate-limit (429)
 * or network error. Returns the raw Response so callers keep their own parsing
 * (JSON or SSE stream). Returns null when every provider is unconfigured,
 * rate-limited, or unreachable.
 * @param {LLMPayload} payload OpenAI-style body without `model`
 * @param {AbortSignal} [signal] optional timeout/abort signal
 * @return {Promise<Response | null>} first usable response, or null
 */
export async function callLLM(
  payload: LLMPayload,
  signal?: AbortSignal
): Promise<Response | null> {
  for (const p of chain()) {
    let res: Response;
    try {
      res = await fetch(p.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${p.key}`,
        },
        body: JSON.stringify({ ...payload, model: p.model }),
        signal,
      });
    } catch {
      continue; // network error / abort → try next provider
    }
    if (res.status === 429) continue; // rate limited → try next provider
    return res; // success or a non-retryable error — caller inspects res.ok
  }
  return null; // all providers unconfigured or rate-limited
}
