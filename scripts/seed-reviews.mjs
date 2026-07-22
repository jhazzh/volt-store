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

// How many reviews per product. Needs this many demo users, since the unique
// (product_id, user_id) constraint allows one review per user per product.
const REVIEWS_PER_PRODUCT = 120;

// Bank of generic review bodies that read naturally for any product type. Each
// pairs a rating with body text and the tags src/lib/review-tags.ts would
// extract, so seeded reviews show chips without an LLM call per row. Ratings
// skew positive (like real stores). We deal these out per product with a
// per-product offset so no two products show the same sequence.
const reviewBank = [
  { rating: 5, body: "Exactly what I hoped for. Build quality feels well above the price and it's held up to daily use.", tags: [{ topic: "build quality", sentiment: "positive" }, { topic: "price", sentiment: "positive" }] },
  { rating: 5, body: "Can't fault it. Shipping was fast and it worked perfectly out of the box.", tags: [{ topic: "shipping", sentiment: "positive" }] },
  { rating: 5, body: "Bought one for myself and ended up gifting two more. Everyone's been impressed.", tags: [{ topic: "gift", sentiment: "positive" }] },
  { rating: 5, body: "Genuinely impressed. The battery lasts longer than advertised and it feels premium.", tags: [{ topic: "battery", sentiment: "positive" }, { topic: "design", sentiment: "positive" }] },
  { rating: 5, body: "Best purchase I've made this year. Setup was painless and it just works.", tags: [{ topic: "setup", sentiment: "positive" }] },
  { rating: 4, body: "Really happy overall. Knocked off a star only because setup took longer than expected.", tags: [{ topic: "setup", sentiment: "negative" }] },
  { rating: 4, body: "Great value. Works reliably and looks nicer in person than the photos suggest.", tags: [{ topic: "value", sentiment: "positive" }, { topic: "appearance", sentiment: "positive" }] },
  { rating: 4, body: "Solid choice. I've recommended it to a few friends already.", tags: [{ topic: "recommendation", sentiment: "positive" }] },
  { rating: 4, body: "Does most things well. Battery could be better but the sound quality makes up for it.", tags: [{ topic: "battery", sentiment: "negative" }, { topic: "sound", sentiment: "positive" }] },
  { rating: 4, body: "Comfortable and well made. Only wish the app were a little more polished.", tags: [{ topic: "comfort", sentiment: "positive" }, { topic: "app", sentiment: "negative" }] },
  { rating: 3, body: "Does the job, but nothing special. A couple of small quirks I've had to work around.", tags: [{ topic: "reliability", sentiment: "neutral" }] },
  { rating: 3, body: "It's fine for the price. Not amazing, not bad — exactly what you'd expect.", tags: [{ topic: "price", sentiment: "neutral" }] },
  { rating: 3, body: "Mixed feelings. Love the design but the connection drops now and then.", tags: [{ topic: "design", sentiment: "positive" }, { topic: "connectivity", sentiment: "negative" }] },
  { rating: 2, body: "Wanted to love it but mine arrived with a minor defect. Support was helpful though.", tags: [{ topic: "defect", sentiment: "negative" }, { topic: "support", sentiment: "positive" }] },
  { rating: 2, body: "Underwhelmed. The battery drains fast and it feels cheaper than I expected.", tags: [{ topic: "battery", sentiment: "negative" }, { topic: "build quality", sentiment: "negative" }] },
  { rating: 1, body: "Stopped working after two weeks. Disappointing for the price.", tags: [{ topic: "reliability", sentiment: "negative" }, { topic: "price", sentiment: "negative" }] },
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
// listUsers is paginated (50/page); page through all so existing reviewers on
// a populated prod DB aren't missed — otherwise we'd try to recreate them.
const byEmail = new Map();
for (let page = 1; ; page++) {
  const { data, error: listErr } = await supabase.auth.admin.listUsers({
    page,
    perPage: 1000,
  });
  if (listErr) throw listErr;
  for (const u of data.users) byEmail.set(u.email, u.id);
  if (data.users.length < 1000) break; // last page
}

// Reviewer identities: review-1@ … review-N@. Created idempotently; first run
// makes all N (slow — one API call each), later runs reuse existing.
const reviewerEmails = Array.from(
  { length: REVIEWS_PER_PRODUCT },
  (_, i) => `review-${i + 1}@example.com`
);

// Page through users to find one by email. Used only when createUser reports
// the email already exists, so we can reuse the id.
async function findUserId(email) {
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw error;
    const hit = data.users.find((u) => u.email === email);
    if (hit) return hit.id;
    if (data.users.length < 1000) return null; // exhausted
  }
}

let created = 0;
for (const email of reviewerEmails) {
  if (byEmail.has(email)) continue;
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: crypto.randomUUID(), // throwaway; demo accounts
    email_confirm: true,
  });
  if (error) {
    // Already registered (a race, or created since we listed). Re-list and
    // reuse its id rather than failing the whole seed.
    const id = await findUserId(email);
    if (!id) throw new Error(`createUser ${email}: ${error.message}`);
    byEmail.set(email, id);
    continue;
  }
  byEmail.set(email, data.user.id);
  created++;
}
if (created) console.log(`Created ${created} demo reviewer(s).`);

// --force also re-writes reviews that are already complete.
const forceReviews = process.argv.includes("--force");

// Build review rows: REVIEWS_PER_PRODUCT per product, one per reviewer. Deal
// from the bank with a per-product offset so no two products show the same
// sequence. Spread created_at back in time (newest = reviewer 1) so the list
// orders naturally. Deterministic — re-running is idempotent via the upsert.
// Products already at REVIEWS_PER_PRODUCT are skipped (nothing new to write).
const DAY = 24 * 60 * 60 * 1000;
const rows = [];
let skipped = 0;
for (let i = 0; i < products.length; i++) {
  const p = products[i];

  if (!forceReviews) {
    const { count, error: cErr } = await supabase
      .from("reviews")
      .select("*", { count: "exact", head: true })
      .eq("product_id", p.id);
    if (cErr) throw cErr;
    if (count >= REVIEWS_PER_PRODUCT) {
      skipped++;
      continue;
    }
  }

  for (let j = 0; j < REVIEWS_PER_PRODUCT; j++) {
    const r = reviewBank[(i + j) % reviewBank.length];
    rows.push({
      product_id: p.id,
      user_id: byEmail.get(reviewerEmails[j]),
      rating: r.rating,
      body: r.body,
      tags: r.tags,
      created_at: new Date(Date.now() - j * DAY).toISOString(),
    });
  }
}

if (rows.length) {
  const { error: upErr } = await supabase
    .from("reviews")
    .upsert(rows, { onConflict: "product_id,user_id" });
  if (upErr) throw upErr;
}

console.log(
  `Seeded ${rows.length} review row(s); skipped ${skipped} product(s) already at ${REVIEWS_PER_PRODUCT}.`
);

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

// Skip products whose cached summary already covers the current review count,
// unless --force. Avoids re-calling Groq (and hitting the TPM limit) on re-runs.
const force = process.argv.includes("--force");

let lastRes;
for (const product of products) {
  const { data: allReviews, error: allErr } = await supabase
    .from("reviews")
    .select("rating, body, created_at")
    .eq("product_id", product.id)
    .order("created_at", { ascending: false });
  if (allErr) throw allErr;
  if (!allReviews.length) continue;

  const { data: current } = await supabase
    .from("products")
    .select("review_summary, review_summary_count")
    .eq("id", product.id)
    .maybeSingle();
  if (
    !force &&
    current?.review_summary &&
    current.review_summary_count === allReviews.length
  ) {
    console.log(`Skipped "${product.name}" (summary up to date).`);
    continue;
  }

  const sample = allReviews
    .slice(0, 100)
    .map((r) => `[${r.rating}/5] ${r.body}`.trim())
    .join("\n");

  // Call Groq. On a 429, wait the server-advised Retry-After and try the same
  // product again — keep waiting until it goes through, never skip ahead.
  let res;
  for (;;) {
    res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
    if (res.status !== 429) break;
    // Honor Retry-After (seconds); fall back to 10s. Loops until not rate-limited.
    const wait = (Number(res.headers.get("retry-after")) || 10) * 1000;
    console.log(`Rate limited on "${product.name}", waiting ${wait / 1000}s...`);
    await new Promise((r) => setTimeout(r, wait));
  }
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
