import { createClient } from "@supabase/supabase-js";

// Seed sample reviews for products.
// Usage:
//   npm run seed:reviews                 # every product
//   npm run seed:reviews -- [slug]       # one product only
//   npm run seed:reviews -- --summarize  # also build AI summaries (Groq)
//   npm run seed:reviews -- --usage      # print Groq rate-limit usage
//
// Creates a pool of confirmed demo users (idempotent) and inserts reviews via
// the admin client, which bypasses the verified-purchase RLS — sample data only.
const slug = process.argv.slice(2).find((a) => !a.startsWith("--"));
const doSummarize = process.argv.includes("--summarize");
const showUsage = process.argv.includes("--usage");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } }
);

// Generic reviews that read naturally for any product type. Each pairs a rating
// with body text. We assign a per-product slice so different products get
// different-looking review sets. Emails are the reviewer identities (one review
// per user per product — the unique constraint).
const reviewPool = [
  { email: "review-1@example.com", rating: 5, body: "Exactly what I hoped for. Build quality feels well above the price and it's held up to daily use." },
  { email: "review-2@example.com", rating: 4, body: "Really happy overall. Knocked off a star only because setup took longer than expected." },
  { email: "review-3@example.com", rating: 5, body: "Bought one for myself and ended up gifting two more. Everyone's been impressed." },
  { email: "review-4@example.com", rating: 3, body: "Does the job, but nothing special. A couple of small quirks I've had to work around." },
  { email: "review-5@example.com", rating: 4, body: "Great value. Works reliably and looks nicer in person than the photos suggest." },
  { email: "review-6@example.com", rating: 5, body: "Can't fault it. Shipping was fast and it worked perfectly out of the box." },
  { email: "review-7@example.com", rating: 2, body: "Wanted to love it but mine arrived with a minor defect. Support was helpful though." },
  { email: "review-8@example.com", rating: 4, body: "Solid choice. I've recommended it to a few friends already." },
];

// Fetch target products.
let query = supabase.from("products").select("id, name, slug");
if (slug) query = query.eq("slug", slug);
const { data: products, error: prodErr } = await query;
if (prodErr) throw prodErr;
if (!products?.length) {
  console.error(slug ? `No product with slug "${slug}".` : "No products found. Run npm run seed first.");
  process.exit(1);
}

// Ensure the reviewer pool exists (create missing), map email -> user id.
const { data: existing, error: listErr } = await supabase.auth.admin.listUsers();
if (listErr) throw listErr;
const byEmail = new Map(existing.users.map((u) => [u.email, u.id]));

for (const { email } of reviewPool) {
  if (byEmail.has(email)) continue;
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: crypto.randomUUID(), // throwaway; demo accounts
    email_confirm: true,
  });
  if (error) throw new Error(`createUser ${email}: ${error.message}`);
  byEmail.set(email, data.user.id);
}

// Build review rows. Rotate the pool per product so sets vary but stay
// deterministic (re-running is idempotent via the upsert below).
const rows = [];
for (let i = 0; i < products.length; i++) {
  const p = products[i];
  const start = i % reviewPool.length;
  const count = 4 + (i % 3); // 4–6 reviews each
  for (let j = 0; j < count; j++) {
    const r = reviewPool[(start + j) % reviewPool.length];
    rows.push({ product_id: p.id, user_id: byEmail.get(r.email), rating: r.rating, body: r.body });
  }
}

const { error: upErr } = await supabase
  .from("reviews")
  .upsert(rows, { onConflict: "product_id,user_id" });
if (upErr) throw upErr;

console.log(`Seeded reviews for ${products.length} product(s) (${rows.length} rows).`);

if (!doSummarize) {
  console.log("Run a product page (or resubmit a review) to build the AI summary.");
  process.exit(0);
}

// --summarize: build cached AI summaries now. Mirrors summarizeReviews
// (src/lib/reviews-summary.ts) — kept inline since this .mjs can't import the .ts.
const key = process.env.GROQ_API_KEY;
if (!key) {
  console.error("GROQ_API_KEY not set — skipping summaries. Add it to .env.local.");
  process.exit(1);
}

let lastRes;
for (const product of products) {
  const { data: allReviews, error: allErr } = await supabase
    .from("reviews")
    .select("rating, body, created_at")
    .eq("product_id", product.id)
    .order("created_at", { ascending: false });
  if (allErr) throw allErr;
  if (!allReviews.length) continue;

  const sample = allReviews
    .slice(0, 100)
    .map((r) => `[${r.rating}/5] ${r.body}`.trim())
    .join("\n");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
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
  lastRes = res;

  if (!res.ok) {
    console.error(`Groq failed for "${product.name}" (${res.status}): ${await res.text()}`);
    continue;
  }
  const data = await res.json();
  const summary = data?.choices?.[0]?.message?.content?.trim();
  if (!summary) {
    console.error(`Groq returned no summary for "${product.name}".`);
    continue;
  }

  const { error: sumErr } = await supabase
    .from("products")
    .update({ review_summary: summary, review_summary_count: allReviews.length })
    .eq("id", product.id);
  if (sumErr) throw sumErr;
  console.log(`Summarized "${product.name}" (${allReviews.length} reviews).`);
}

// --usage: percent of each rate-limit period consumed, from Groq's last response.
if (showUsage && lastRes) {
  const pct = (kind) => {
    const limit = Number(lastRes.headers.get(`x-ratelimit-limit-${kind}`));
    const remaining = Number(lastRes.headers.get(`x-ratelimit-remaining-${kind}`));
    if (!limit) return `${kind}: n/a`;
    const used = (((limit - remaining) / limit) * 100).toFixed(1);
    return `${kind}: ${used}% used (${remaining}/${limit} left)`;
  };
  console.log(`\nGroq usage — ${pct("requests")} | ${pct("tokens")}`);
}
