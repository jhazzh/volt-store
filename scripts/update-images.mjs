import { createClient } from "@supabase/supabase-js";

// Update ONLY product image_url from the map below. Unlike `seed`, this leaves
// price/stock/description untouched — safe to run against prod.
// Usage: npm run update:images            (local)
//        npm run update:images -- --prod  (live)

const u = (id) => `https://images.unsplash.com/photo-${id}?w=800&h=800&fit=crop`;

const images = {
  "nimbus-headphones": u("1505740420928-5e560c06d30e"),
  "pulse-earbuds": u("1590658268037-6bf12165a8df"),
  "echo-mini-speaker": u("1608043152269-423dbba4e7e1"),
  "orbit-watch-s": u("1523275335684-37898b6baf30"),
  "stride-band": u("1575311373937-040b8e1fd5b6"),
  "volt-charger-65w": u("1583863788434-e58a36330cf0"),
  "drift-mouse-pro": u("1527864550417-7fd91fc51a46"),
  "atlas-backpack": u("1553062407-98eeb64c6a62"),
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } }
);

for (const [slug, url] of Object.entries(images)) {
  const { error } = await supabase
    .from("products")
    .update({ image_url: url })
    .eq("slug", slug);
  console.log(slug, error ? `FAILED: ${error.message}` : "ok");
}
