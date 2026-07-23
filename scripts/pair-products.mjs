// Backfill "goes well with" pairings. Safe to re-run — only fills rows that
// have none yet. Use --all to recompute the whole catalog (e.g. after adding
// a batch of accessories that older pairings couldn't have seen).
// Run: npm run pair   |   npm run pair -- --all
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
const groqKey = process.env.GROQ_API_KEY;
const geminiKey = process.env.GEMINI_API_KEY;

if (!groqKey && !geminiKey) {
  console.error("No GROQ_API_KEY or GEMINI_API_KEY — nothing to pair with.");
  process.exit(1);
}

const all = process.argv.includes("--all");
const supabase = createClient(url, key, { auth: { persistSession: false } });

const PAIR_COUNT = 3;
const CANDIDATE_COUNT = 25;
// Groq's free tier limits tokens/min as well as requests/min, and a 25-item
// candidate list is a big prompt — 3s keeps a full-catalog run under both.
const DELAY_MS = 3000;

// Keep in sync with src/lib/goes-well-with.ts (the admin create/update path).
const SYSTEM_PROMPT =
  "You pick complementary products for an online store. Given one product and " +
  `a numbered candidate list, choose up to ${PAIR_COUNT} candidates a shopper ` +
  "buying the product would plausibly add to the same order — accessories, " +
  "consumables, or things used together.\n\n" +
  "Apply this test to every candidate: would someone buy it IN ADDITION TO " +
  "the product, on the same day? If they'd buy it INSTEAD, it's a substitute " +
  "— reject it. Two headphones are substitutes. Headphones and a case are " +
  "complements.\n\n" +
  "Most candidate lists contain no true complement at all, because the list " +
  "is built by similarity and similar things are usually substitutes. That " +
  "is the normal case and an empty list is the correct answer for it. Never " +
  `pad the list to reach ${PAIR_COUNT}. One good pick beats three weak ones; ` +
  "zero beats one bad one.\n\n" +
  'Reply only as JSON: {"picks":[<numbers>]}, best first, using the ' +
  "candidates' numbers.";

const PROVIDERS = [
  {
    name: "groq",
    url: "https://api.groq.com/openai/v1/chat/completions",
    model: "llama-3.3-70b-versatile",
    key: groqKey,
  },
  {
    name: "gemini",
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    model: "gemini-flash-latest",
    key: geminiKey,
  },
].filter((p) => p.key);

/**
 * Call the provider chain, retrying on rate limit. Mirrors src/lib/llm.ts.
 * Returns { res } on any HTTP reply, or { error } describing why every
 * provider failed — the caller prints it, so a failed row is never silent.
 */
// Providers whose daily quota is spent — skipped for the rest of the run.
const exhausted = new Set();

async function callLLM(payload) {
  const failures = [];
  const usable = PROVIDERS.filter((p) => !exhausted.has(p.name));
  if (usable.length === 0) {
    return { error: "all providers exhausted for today" };
  }

  // Retry the whole chain on rate limit: a full-catalog run reliably trips
  // Groq's per-minute token budget, and backing off clears it.
  for (let attempt = 0; attempt < 4; attempt++) {
    let rateLimited = false;
    for (const p of usable) {
      if (exhausted.has(p.name)) continue; // hit its daily cap mid-run
      let res;
      try {
        res = await fetch(p.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${p.key}`,
          },
          body: JSON.stringify({ ...payload, model: p.model }),
        });
      } catch (e) {
        failures.push(`${p.name}: ${e.message}`);
        continue; // network error → try next provider
      }
      if (res.status === 429) {
        // Surface the provider's own explanation — a per-minute burst clears
        // on its own, a spent daily quota never does within a run.
        const detail = await res
          .text()
          .then((t) => {
            try {
              return JSON.parse(t)?.error?.message ?? t;
            } catch {
              return t;
            }
          })
          .catch(() => "");
        // Daily quota → drop the provider for the rest of the run rather than
        // waiting out a limit that won't reset for hours.
        if (/quota|per day|daily/i.test(detail)) {
          exhausted.add(p.name);
          console.log(`    ${p.name}: daily quota spent — skipping it from here`);
        } else {
          rateLimited = true;
        }
        failures.push(`${p.name}: 429 ${detail.slice(0, 160)}`);
        continue;
      }
      return { res };
    }
    if (!rateLimited) break; // failed for some other reason — don't spin

    const waitMs = 15000 * (attempt + 1);
    if (attempt < 3) {
      console.log(
        `    rate-limited, retrying in ${waitMs / 1000}s ` +
          `(attempt ${attempt + 2}/4) — ${failures.at(-1)}`
      );
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  return { error: failures.join(" | ") || "no providers configured" };
}

/** Semantic neighbours + same-category rows, deduped, excluding the source. */
async function candidatesFor(product) {
  const [related, sameCategory] = await Promise.all([
    supabase.rpc("related_products", {
      source_id: product.id,
      match_count: CANDIDATE_COUNT,
    }),
    product.category_id
      ? supabase
          .from("products")
          .select("id, name")
          .eq("category_id", product.category_id)
          .neq("id", product.id)
          .limit(Math.ceil(CANDIDATE_COUNT / 2))
      : Promise.resolve({ data: [] }),
  ]);

  const byId = new Map();
  for (const row of [...(related.data ?? []), ...(sameCategory.data ?? [])]) {
    if (row.id === product.id || byId.has(row.id)) continue;
    byId.set(row.id, { id: row.id, name: row.name });
  }
  return [...byId.values()].slice(0, CANDIDATE_COUNT);
}

/** Map the model's 1-based picks back to ids, dropping anything invalid. */
function parsePicks(text, candidates) {
  let picks;
  try {
    picks = JSON.parse(text)?.picks;
  } catch {
    return [];
  }
  if (!Array.isArray(picks)) return [];

  const ids = [];
  for (const n of picks) {
    const i = Number(n) - 1;
    const c = candidates[i];
    if (!Number.isInteger(i) || !c || ids.includes(c.id)) continue;
    ids.push(c.id);
    if (ids.length === PAIR_COUNT) break;
  }
  return ids;
}

let query = supabase
  .from("products")
  .select("id, name, category_id")
  .not("embedding", "is", null) // no vector → no candidate pool
  .order("name");
// Resume on paired_at, not on an empty array: "no complements found" is a
// settled result, and re-running shouldn't pay for it again.
if (!all) query = query.is("paired_at", null);

const { data: products, error } = await query;
if (error) throw error;

if (!products.length) {
  console.log(
    all
      ? "No embedded products found. Run `npm run embed` first."
      : "All embedded products already processed. Use --all to recompute."
  );
  process.exit(0);
}

const providerNames = PROVIDERS.map((p) => p.name).join(" → ");
console.log(
  `Pairing ${products.length} product(s)` +
    `${all ? " (--all: recomputing everything)" : ""}\n` +
    `Providers: ${providerNames}   Delay: ${DELAY_MS / 1000}s between calls\n` +
    `Estimated: ~${Math.ceil((products.length * DELAY_MS) / 60000)} min\n`
);

const stats = { paired: 0, empty: 0, failed: 0, noCandidates: 0 };
const startedAt = Date.now();

for (const [i, p] of products.entries()) {
  const n = `[${i + 1}/${products.length}]`;
  const candidates = await candidatesFor(p);
  if (candidates.length === 0) {
    console.log(`${n} – ${p.name}: no candidates (needs more catalog)`);
    stats.noCandidates++;
    continue;
  }

  console.log(`${n} ${p.name} — ${candidates.length} candidates`);

  const list = candidates.map((c, k) => `${k + 1}. ${c.name}`).join("\n");
  const { res, error: llmError } = await callLLM({
    // Generous: with response_format json_object the model must finish the
    // document, and truncation is a hard 400 (json_validate_failed), not a
    // short answer. The reply is only ~20 tokens; the headroom is free.
    max_tokens: 400,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Product: ${p.name}\n\nCandidates:\n${list}` },
    ],
  });

  if (!res) {
    // Leave paired_at null so the next plain `npm run pair` picks it up.
    console.error(`    ✗ ${llmError}`);
    stats.failed++;
    continue;
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`    ✗ HTTP ${res.status} ${body.slice(0, 200)}`);
    stats.failed++;
    continue;
  }

  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content ?? "";
  const picks = parsePicks(raw, candidates);
  // A reply we couldn't parse is worth seeing — it means the model ignored
  // the JSON contract, which the empty-result path would otherwise hide.
  if (picks.length === 0 && raw.trim() && !/"picks"\s*:\s*\[\s*\]/.test(raw)) {
    console.log(`    ? unparsed reply: ${raw.replace(/\s+/g, " ").slice(0, 120)}`);
  }

  const { error: upErr } = await supabase
    .from("products")
    .update({ goes_well_with: picks, paired_at: new Date().toISOString() })
    .eq("id", p.id);

  if (upErr) {
    console.error(`    ✗ write failed: ${upErr.message}`);
    stats.failed++;
    continue;
  }

  const names = picks
    .map((id) => candidates.find((c) => c.id === id)?.name)
    .filter(Boolean);
  if (names.length) {
    console.log(`    ✓ ${names.join(", ")}`);
    stats.paired++;
  } else {
    // Expected, not a failure: similarity-built pools often hold only
    // substitutes. See the prompt in src/lib/goes-well-with.ts.
    console.log("    ✓ (none — no true complement in pool)");
    stats.empty++;
  }

  // Stay under the free-tier rate limit; skip the wait after the last one.
  if (i < products.length - 1) await new Promise((r) => setTimeout(r, DELAY_MS));
}

const mins = Math.round((Date.now() - startedAt) / 60000);
console.log(
  `\nDone in ~${mins} min — ` +
    `${stats.paired} paired, ${stats.empty} empty, ` +
    `${stats.failed} failed, ${stats.noCandidates} without candidates.`
);
if (stats.failed > 0) {
  console.log("Re-run `npm run pair` to retry the failed ones.");
}
