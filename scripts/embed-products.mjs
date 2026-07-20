// Backfill product embeddings. Safe to re-run — only fills rows missing one.
// Run: npm run embed
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;

const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data: products, error } = await supabase
  .from("products")
  .select("id, name, description")
  .is("embedding", null);
if (error) throw error;

if (!products.length) {
  console.log("All products already embedded.");
  process.exit(0);
}

console.log(`Embedding ${products.length} product(s)...`);

for (const p of products) {
  const res = await fetch(`${url}/functions/v1/embed`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ text: `${p.name}. ${p.description}` }),
  });

  if (!res.ok) {
    console.error(`  ✗ ${p.name}: ${res.status} ${await res.text()}`);
    continue;
  }

  const { embedding } = await res.json();
  const { error: upErr } = await supabase
    .from("products")
    .update({ embedding })
    .eq("id", p.id);

  if (upErr) console.error(`  ✗ ${p.name}: ${upErr.message}`);
  else console.log(`  ✓ ${p.name}`);
}

console.log("Done.");
