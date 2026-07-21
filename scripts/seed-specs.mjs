import { createClient } from "@supabase/supabase-js";

// Seed per-product specs (Color, Connectivity, Warranty, …).
// Usage:
//   npm run seed:specs            # local (.env.local)
//   npm run seed:specs -- --prod  # live project
//
// Idempotent: clears each listed product's specs, then reinserts. position is
// the array order.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } }
);

// The controlled vocabulary (spec_keys) that product_specs.key references, plus
// the allowed options for enum/multiselect keys (spec_key_values). Must exist
// before product_specs rows, or the key FK fails.
const specKeys = [
  { name: "Color", type: "multiselect" },
  { name: "Connectivity", type: "enum" },
  { name: "Warranty", type: "enum" },
];
// key -> options in display order.
const specKeyValues = {
  Color: ["Black", "White", "Navy"],
  Connectivity: ["Wireless", "Wired"],
  Warranty: ["1 year", "2 years"],
};

// slug -> [[key, value], …] in display order.
const specsBySlug = {
  "echo-mini-speaker": [["Color", "Black"], ["Connectivity", "Wireless"], ["Warranty", "1 year"]],
  "nimbus-headphones": [["Color", "Black"], ["Connectivity", "Wireless"], ["Warranty", "2 years"]],
  "stride-band": [["Color", "Black"], ["Connectivity", "Wireless"], ["Warranty", "1 year"]],
  "volt-charger-65w": [["Color", "White"], ["Connectivity", "Wired"], ["Warranty", "2 years"]],
  "drift-mouse-pro": [["Color", "Black"], ["Connectivity", "Wireless"], ["Warranty", "1 year"]],
  "orbit-watch-s": [["Color", "White"], ["Connectivity", "Wireless"], ["Warranty", "2 years"]],
  "atlas-backpack": [["Color", "Navy"], ["Warranty", "2 years"]],
  "pulse-earbuds": [["Color", "Black"], ["Color", "White"], ["Connectivity", "Wireless"], ["Warranty", "1 year"]],
};

// Upsert the vocabulary first (idempotent), so the key FK is satisfied.
const { error: keysErr } = await supabase
  .from("spec_keys")
  .upsert(specKeys, { onConflict: "name" });
if (keysErr) throw keysErr;

const valueRows = Object.entries(specKeyValues).flatMap(([key, values]) =>
  values.map((value, position) => ({ key, value, position }))
);
const { error: valsErr } = await supabase
  .from("spec_key_values")
  .upsert(valueRows, { onConflict: "key,value" });
if (valsErr) throw valsErr;

// Resolve slugs to product ids.
const slugs = Object.keys(specsBySlug);
const { data: products, error: prodErr } = await supabase
  .from("products")
  .select("id, slug")
  .in("slug", slugs);
if (prodErr) throw prodErr;

const idBySlug = new Map(products.map((p) => [p.slug, p.id]));
const missing = slugs.filter((s) => !idBySlug.has(s));
if (missing.length) console.warn(`Skipping unknown slugs: ${missing.join(", ")}`);

const ids = [...idBySlug.values()];
if (!ids.length) {
  console.error("No matching products. Run npm run seed first.");
  process.exit(1);
}

// Clear existing specs for these products so re-running is idempotent.
const { error: delErr } = await supabase.from("product_specs").delete().in("product_id", ids);
if (delErr) throw delErr;

// Build + insert fresh rows.
const rows = [];
for (const [slug, specs] of Object.entries(specsBySlug)) {
  const productId = idBySlug.get(slug);
  if (!productId) continue;
  specs.forEach(([key, value], position) => {
    rows.push({ product_id: productId, key, value, position });
  });
}

const { error: insErr } = await supabase.from("product_specs").insert(rows);
if (insErr) throw insErr;

console.log(
  `Seeded ${specKeys.length} spec keys, ${valueRows.length} options, ` +
    `${rows.length} specs across ${idBySlug.size} product(s).`
);
