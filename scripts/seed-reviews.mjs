import { createClient } from "@supabase/supabase-js";

// Seed sample reviews for one product (default: Echo Mini Speaker).
// Usage: npm run seed:reviews -- [product-slug]
//
// Creates a few confirmed test users (idempotent) and inserts reviews via the
// admin client, which bypasses the verified-purchase RLS — sample data only.
const slug = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "echo-mini-speaker";
const doSummarize = process.argv.includes("--summarize");
const showUsage = process.argv.includes("--usage");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } }
);

// Reviewer identities + their reviews. One review per user per product (the
// unique constraint), so keep emails distinct.
const sampleReviews = [
  { email: "review-maya@example.com", rating: 5, body: "Way louder than its size suggests — the bass genuinely surprised me. Fits in a jacket pocket." },
  { email: "review-devin@example.com", rating: 4, body: "Great sound and battery. Docked a star because pairing to two devices is fiddly." },
  { email: "review-priya@example.com", rating: 5, body: "Perfect for the kitchen. Survived a splash near the sink without issue." },
  { email: "review-tom@example.com", rating: 3, body: "Sound is good but the volume buttons feel mushy and it took a few tries to register presses." },
  { email: "review-lena@example.com", rating: 4, body: "Punchy for the price. Wish it got a touch louder for outdoor use, but indoors it's plenty." },
  { email: "review-omar@example.com", rating: 5, body: "Bought two as gifts. Both recipients loved the bass and the tiny footprint." },
];

// Look up the product.
const { data: product, error: prodErr } = await supabase
  .from("products")
  .select("id, name")
  .eq("slug", slug)
  .maybeSingle();
if (prodErr) throw prodErr;
if (!product) {
  console.error(`No product with slug "${slug}". Run npm run seed first.`);
  process.exit(1);
}

// Ensure each reviewer exists (create if missing), then collect their ids.
const { data: existing, error: listErr } = await supabase.auth.admin.listUsers();
if (listErr) throw listErr;
const byEmail = new Map(existing.users.map((u) => [u.email, u.id]));

const rows = [];
for (const { email, rating, body } of sampleReviews) {
  let userId = byEmail.get(email);
  if (!userId) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: crypto.randomUUID(), // throwaway; these are demo accounts
      email_confirm: true,
    });
    if (error) throw new Error(`createUser ${email}: ${error.message}`);
    userId = data.user.id;
  }
  rows.push({ product_id: product.id, user_id: userId, rating, body });
}

// Upsert so re-running the seed is idempotent.
const { error: upErr } = await supabase
  .from("reviews")
  .upsert(rows, { onConflict: "product_id,user_id" });
if (upErr) throw upErr;

console.log(`Seeded ${rows.length} reviews for "${product.name}".`);

if (!doSummarize) {
  console.log("Run the product page (or resubmit a review) to build the AI summary.");
  process.exit(0);
}

// --summarize: build the cached AI summary now. Mirrors the server action's
// summarizeReviews (src/lib/reviews-summary.ts) — kept inline because this
// .mjs script can't import the .ts lib at runtime.
const key = process.env.GROQ_API_KEY;
if (!key) {
  console.error("GROQ_API_KEY not set — skipping summary. Add it to .env.local.");
  process.exit(1);
}

const { data: allReviews, error: allErr } = await supabase
  .from("reviews")
  .select("rating, body, created_at")
  .eq("product_id", product.id)
  .order("created_at", { ascending: false });
if (allErr) throw allErr;

const sample = allReviews
  .slice(0, 100)
  .map((r) => `[${r.rating}/5] ${r.body}`.trim())
  .join("\n");

const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${key}`,
  },
  body: JSON.stringify({
    model: "llama-3.3-70b-versatile",
    max_tokens: 300,
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content:
          "You summarize customer reviews for an online store. Write 2-3 plain " +
          "sentences a shopper can skim: the overall sentiment, then the praise and " +
          "complaints that come up most. Neutral and factual — never invent details " +
          "not present in the reviews, and never address the reader.",
      },
      { role: "user", content: `Product: ${product.name}\n\nReviews:\n${sample}` },
    ],
  }),
});

// --usage: percent of each rate-limit period consumed, from Groq's headers.
if (showUsage) {
  const pct = (kind) => {
    const limit = Number(res.headers.get(`x-ratelimit-limit-${kind}`));
    const remaining = Number(res.headers.get(`x-ratelimit-remaining-${kind}`));
    if (!limit) return `${kind}: n/a`;
    const used = (((limit - remaining) / limit) * 100).toFixed(1);
    return `${kind}: ${used}% used (${remaining}/${limit} left)`;
  };
  console.log(`\nGroq usage — ${pct("requests")} | ${pct("tokens")}`);
}

if (!res.ok) {
  console.error(`Groq request failed (${res.status}): ${await res.text()}`);
  process.exit(1);
}

const data = await res.json();
const summary = data?.choices?.[0]?.message?.content?.trim();
if (!summary) {
  console.error("Groq returned no summary text.");
  process.exit(1);
}

const { error: sumErr } = await supabase
  .from("products")
  .update({ review_summary: summary, review_summary_count: allReviews.length })
  .eq("id", product.id);
if (sumErr) throw sumErr;

console.log(`\nSummary (${allReviews.length} reviews):\n${summary}`);
