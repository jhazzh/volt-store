import "server-only";

// Groq's OpenAI-compatible endpoint. Free tier, doesn't train on inputs.
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

const SYSTEM_PROMPT =
  "You write product descriptions for an online store. Given a product's " +
  "name and details, write 2-3 plain sentences a shopper can skim: what it " +
  "is and why they'd want it. Concrete and factual — never invent specs, " +
  "prices, or claims not implied by the name. No marketing fluff, no " +
  "headings, no bullet points.";

/** Context the LLM uses to draft a description. Only name is required. */
export type DescriptionInput = {
  name: string;
  category?: string | null;
  price?: number | null;
  productType?: string | null;
};

/**
 * Draft a shopper-facing product description from its basic details.
 * Returns null if the API key is unset (dev without credentials) or the call
 * fails, so callers can surface a friendly error instead of crashing.
 * @param {DescriptionInput} input product name and optional context
 * @return {Promise<string | null>} description text, or null when disabled/failed
 */
export async function generateDescription(
  input: DescriptionInput
): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;

  const details = [
    `Name: ${input.name}`,
    input.category ? `Category: ${input.category}` : null,
    input.price != null ? `Price: $${input.price}` : null,
    input.productType ? `Type: ${input.productType}` : null,
  ]
    .filter(Boolean)
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
      temperature: 0.7,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: details },
      ],
    }),
  });

  if (!res.ok) return null; // rate limited / transient
  const data = await res.json();
  const text: string | undefined = data?.choices?.[0]?.message?.content;
  return text?.trim() ?? null;
}
