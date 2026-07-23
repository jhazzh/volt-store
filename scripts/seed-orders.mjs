import { createClient } from "@supabase/supabase-js";

// Seed demo buyers with paid orders, so "Picked for you" (picked_for_you RPC)
// has history to personalize from. A few buyers with distinct tastes, so each
// login shows visibly different picks.
// Usage:
//   npm run seed:orders            # create/reuse buyers, add orders if missing
//   npm run seed:orders -- --force # re-create orders even if the buyer has some
//
// Uses the admin client, which bypasses orders RLS — demo data only.
const force = process.argv.includes("--force");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } }
);

// Each buyer buys from these category slugs, giving a clear taste vector.
const buyers = [
  { email: "buyer-audio@example.com", categories: ["audio"] },
  { email: "buyer-gaming@example.com", categories: ["gaming"] },
  { email: "buyer-wearables@example.com", categories: ["wearables", "accessories"] },
];

// Products grouped by category slug, so we can pick a taste-consistent basket.
const { data: products, error: prodErr } = await supabase
  .from("products")
  .select("id, price, categories!inner(slug)");
if (prodErr) throw prodErr;
if (!products?.length) {
  console.error("No products found. Run npm run seed first.");
  process.exit(1);
}

const byCategory = new Map();
for (const p of products) {
  const slug = p.categories.slug;
  if (!byCategory.has(slug)) byCategory.set(slug, []);
  byCategory.get(slug).push(p);
}

// Find a user id by email, paging through the (paginated) admin list.
async function findUserId(email) {
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw error;
    const hit = data.users.find((u) => u.email === email);
    if (hit) return hit.id;
    if (data.users.length < 1000) return null;
  }
}

// Create the buyer if missing, reusing the id when it already exists.
async function ensureUser(email) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: crypto.randomUUID(), // throwaway; demo account
    email_confirm: true,
  });
  if (error) {
    const id = await findUserId(email);
    if (!id) throw new Error(`createUser ${email}: ${error.message}`);
    return id;
  }
  return data.user.id;
}

for (const buyer of buyers) {
  const userId = await ensureUser(buyer.email);

  const { count, error: countErr } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (countErr) throw countErr;
  if (count && !force) {
    console.log(`${buyer.email}: has ${count} order(s), skipping.`);
    continue;
  }

  // Basket: up to 4 products from the buyer's categories.
  const pool = buyer.categories.flatMap((c) => byCategory.get(c) ?? []);
  const basket = pool.slice(0, 4);
  if (basket.length === 0) {
    console.warn(`${buyer.email}: no products in ${buyer.categories}, skipping.`);
    continue;
  }

  // One paid order per basket item, so history spans several products.
  for (const p of basket) {
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({ user_id: userId, total: p.price, status: "paid" })
      .select("id")
      .single();
    if (orderErr) throw orderErr;
    const { error: itemErr } = await supabase.from("order_items").insert({
      order_id: order.id,
      product_id: p.id,
      qty: 1,
      unit_price: p.price,
    });
    if (itemErr) throw itemErr;
  }
  console.log(`${buyer.email}: seeded ${basket.length} paid order(s).`);
}

console.log("Done.");
