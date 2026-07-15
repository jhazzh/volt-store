"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createStripeClient } from "@/lib/stripe";
import { siteUrl } from "@/lib/site-url";
import { checkoutSchema, type CheckoutInput } from "@/lib/validation";

export type CheckoutState = { error?: string };

/**
 * Starts a Stripe Checkout session. Security: requires auth, validates input
 * with Zod, re-reads prices from DB (never trusts client totals), RLS enforces
 * ownership. Order starts 'pending'; the Stripe webhook marks it 'paid'.
 * @param {CheckoutInput} input cart items (ids + qty only)
 * @return {Promise<CheckoutState>} error state (redirects to Stripe on success)
 */
export async function startCheckout(input: CheckoutInput): Promise<CheckoutState> {
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
    .select("id, name, price, stock")
    .in("id", ids);
  if (productsError || !products || products.length !== ids.length) {
    return { error: "Some products no longer exist." };
  }

  const productById = new Map(products.map((p) => [p.id, p]));
  let total = 0;
  for (const item of parsed.data.items) {
    const product = productById.get(item.productId)!;
    if (product.stock < item.qty) return { error: "Insufficient stock." };
    total += Number(product.price) * item.qty; // DB price, not client price
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({ user_id: user.id, total, status: "pending" })
    .select("id")
    .single();
  if (orderError || !order) return { error: "Could not create order." };

  const { error: itemsError } = await supabase.from("order_items").insert(
    parsed.data.items.map((i) => ({
      order_id: order.id,
      product_id: i.productId,
      qty: i.qty,
      unit_price: Number(productById.get(i.productId)!.price),
    }))
  );
  if (itemsError) return { error: "Could not save order items." };

  const stripe = createStripeClient();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    client_reference_id: order.id,
    customer_email: user.email,
    metadata: { order_id: order.id },
    line_items: parsed.data.items.map((i) => {
      const product = productById.get(i.productId)!;
      return {
        quantity: i.qty,
        price_data: {
          currency: "usd",
          unit_amount: Math.round(Number(product.price) * 100), // cents
          product_data: { name: product.name },
        },
      };
    }),
    success_url: `${siteUrl()}/orders/${order.id}`,
    cancel_url: `${siteUrl()}/checkout`,
  });
  if (!session.url) return { error: "Could not start payment." };

  redirect(session.url);
}
