"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkoutSchema, type CheckoutInput } from "@/lib/validation";

export type CheckoutState = { error?: string };

/**
 * Places an order. Security: requires auth, validates input with Zod,
 * re-reads prices from DB (never trusts client totals), RLS enforces ownership.
 * @param {CheckoutInput} input cart items (ids + qty only)
 * @return {Promise<CheckoutState>} error state (redirects on success)
 */
export async function placeOrder(input: CheckoutInput): Promise<CheckoutState> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid cart data." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ids = parsed.data.items.map((i) => i.productId);
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, price, stock")
    .in("id", ids);
  if (productsError || !products || products.length !== ids.length) {
    return { error: "Some products no longer exist." };
  }

  const priceById = new Map(products.map((p) => [p.id, p]));
  let total = 0;
  for (const item of parsed.data.items) {
    const product = priceById.get(item.productId)!;
    if (product.stock < item.qty) return { error: "Insufficient stock." };
    total += Number(product.price) * item.qty; // DB price, not client price
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({ user_id: user.id, total, status: "paid" })
    .select("id")
    .single();
  if (orderError || !order) return { error: "Could not create order." };

  const { error: itemsError } = await supabase.from("order_items").insert(
    parsed.data.items.map((i) => ({
      order_id: order.id,
      product_id: i.productId,
      qty: i.qty,
      unit_price: Number(priceById.get(i.productId)!.price),
    }))
  );
  if (itemsError) return { error: "Could not save order items." };

  redirect(`/orders/${order.id}`);
}
