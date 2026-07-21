import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } }
);

const categories = [
  { name: "Audio", slug: "audio" },
  { name: "Wearables", slug: "wearables" },
  { name: "Accessories", slug: "accessories" },
];

const products = [
  ["Nimbus Headphones", "nimbus-headphones", "Over-ear ANC headphones with 40h battery.", 189, 24, "nimbus", "audio"],
  ["Pulse Earbuds", "pulse-earbuds", "True wireless earbuds, IPX5, low-latency mode.", 89, 60, "pulse", "audio"],
  ["Echo Mini Speaker", "echo-mini-speaker", "Pocket bluetooth speaker with punchy bass.", 49, 35, "echo", "audio"],
  ["Orbit Watch S", "orbit-watch-s", "AMOLED smartwatch, GPS, 7-day battery.", 249, 18, "orbit", "wearables"],
  ["Stride Band", "stride-band", "Slim fitness tracker with sleep insights.", 59, 80, "stride", "wearables"],
  ["Volt Charger 65W", "volt-charger-65w", "GaN USB-C charger, dual port.", 39, 100, "volt", "accessories"],
  ["Drift Mouse Pro", "drift-mouse-pro", "Ergonomic wireless mouse, 4000 DPI.", 69, 45, "mouse", "accessories"],
  ["Atlas Backpack", "atlas-backpack", "Water-resistant 20L tech backpack.", 99, 22, "atlas", "accessories"],
];

// Per-slug real photos; anything not listed falls back to a picsum placeholder.
const u = (id) =>
  `https://images.unsplash.com/photo-${id}?w=800&h=800&fit=crop`;
const imageOverrides = {
  "nimbus-headphones": u("1505740420928-5e560c06d30e"),
  "pulse-earbuds": u("1590658268037-6bf12165a8df"),
  "echo-mini-speaker": u("1608043152269-423dbba4e7e1"),
  "orbit-watch-s": u("1523275335684-37898b6baf30"),
  "stride-band": u("1575311373937-040b8e1fd5b6"),
  "volt-charger-65w": u("1583863788434-e58a36330cf0"),
  "drift-mouse-pro": u("1527864550417-7fd91fc51a46"),
  "atlas-backpack": u("1553062407-98eeb64c6a62"),
};

const { data: cats, error: catErr } = await supabase
  .from("categories")
  .upsert(categories, { onConflict: "slug" })
  .select("id, slug");
if (catErr) throw catErr;

const catId = Object.fromEntries(cats.map((c) => [c.slug, c.id]));

const rows = products.map(([name, slug, description, price, stock, seed, cat]) => ({
  name,
  slug,
  description,
  price,
  stock,
  // Real product photo where we have one; picsum placeholder otherwise.
  image_url:
    imageOverrides[slug] ?? `https://picsum.photos/seed/${seed}/800/800`,
  category_id: catId[cat],
}));

const { error: prodErr } = await supabase
  .from("products")
  .upsert(rows, { onConflict: "slug" });
if (prodErr) throw prodErr;

const { count } = await supabase
  .from("products")
  .select("*", { count: "exact", head: true });
console.log(`Seeded. products in DB: ${count}`);
