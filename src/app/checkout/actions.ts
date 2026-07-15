"use server";

import { redirect } from "next/navigation";
import { CheckoutPaymentIntent } from "@paypal/paypal-server-sdk";
import { createClient } from "@/lib/supabase/server";
import { createStripeClient } from "@/lib/stripe";
import { createPaypalOrders } from "@/lib/paypal";
import { createXenditInvoices } from "@/lib/xendit";
import { usdToIdrRate } from "@/lib/fx";
import { siteUrl } from "@/lib/site-url";
import { checkoutSchema, type CheckoutInput } from "@/lib/validation";

export type CheckoutState = { error?: string };

type PendingOrder = {
  orderId: string;
  total: number;
  email?: string;
  lines: { name: string; qty: number; unitPrice: number }[];
};

/**
 * Shared by both providers. Security: requires auth, validates input with
 * Zod, re-reads prices from DB (never trusts client totals), RLS enforces
 * ownership. Order starts 'pending'; provider callback marks it 'paid'.
 * @param {CheckoutInput} input cart items (ids + qty only)
 * @return {Promise<PendingOrder | { error: string }>} pending order or error
 */
async function createPendingOrder(
  input: CheckoutInput
): Promise<PendingOrder | { error: string }> {
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

  return {
    orderId: order.id,
    total,
    email: user.email,
    lines: parsed.data.items.map((i) => {
      const product = productById.get(i.productId)!;
      return { name: product.name, qty: i.qty, unitPrice: Number(product.price) };
    }),
  };
}

/**
 * Starts a Stripe Checkout session. The Stripe webhook marks the order 'paid'.
 * @param {CheckoutInput} input cart items (ids + qty only)
 * @return {Promise<CheckoutState>} error state (redirects to Stripe on success)
 */
export async function startCheckout(input: CheckoutInput): Promise<CheckoutState> {
  const pending = await createPendingOrder(input);
  if ("error" in pending) return pending;

  const stripe = createStripeClient();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    client_reference_id: pending.orderId,
    customer_email: pending.email,
    metadata: { order_id: pending.orderId },
    line_items: pending.lines.map((line) => ({
      quantity: line.qty,
      price_data: {
        currency: "usd",
        unit_amount: Math.round(line.unitPrice * 100), // cents
        product_data: { name: line.name },
      },
    })),
    success_url: `${siteUrl()}/orders/${pending.orderId}`,
    cancel_url: `${siteUrl()}/checkout`,
  });
  if (!session.url) return { error: "Could not start payment." };

  redirect(session.url);
}

/**
 * Starts a PayPal checkout. No webhook: /api/paypal/return captures the
 * payment server-side and marks the order 'paid'.
 * @param {CheckoutInput} input cart items (ids + qty only)
 * @return {Promise<CheckoutState>} error state (redirects to PayPal on success)
 */
export async function startPaypalCheckout(input: CheckoutInput): Promise<CheckoutState> {
  const pending = await createPendingOrder(input);
  if ("error" in pending) return pending;

  const { result } = await createPaypalOrders().createOrder({
    body: {
      intent: CheckoutPaymentIntent.Capture,
      purchaseUnits: [
        {
          customId: pending.orderId, // capture route maps it back to our order
          amount: { currencyCode: "USD", value: pending.total.toFixed(2) },
        },
      ],
      applicationContext: {
        returnUrl: `${siteUrl()}/api/paypal/return`,
        cancelUrl: `${siteUrl()}/checkout`,
      },
    },
  });

  const approve = result.links?.find((l) => l.rel === "approve" || l.rel === "payer-action");
  if (!approve) return { error: "Could not start payment." };

  redirect(approve.href);
}

/**
 * Starts a Xendit hosted invoice (QRIS, VA, e-wallets, cards — in IDR).
 * The webhook or /api/xendit/return marks the order 'paid'.
 * @param {CheckoutInput} input cart items (ids + qty only)
 * @return {Promise<CheckoutState>} error state (redirects to Xendit on success)
 */
export async function startXenditCheckout(input: CheckoutInput): Promise<CheckoutState> {
  const pending = await createPendingOrder(input);
  if ("error" in pending) return pending;

  const invoice = await createXenditInvoices().createInvoice({
    data: {
      externalId: pending.orderId, // webhook/return route maps it back to our order
      amount: Math.round(pending.total * (await usdToIdrRate())), // store is USD; local rails are IDR
      currency: "IDR",
      payerEmail: pending.email,
      successRedirectUrl: `${siteUrl()}/api/xendit/return?order=${pending.orderId}`,
      failureRedirectUrl: `${siteUrl()}/checkout`,
    },
  });

  redirect(invoice.invoiceUrl);
}
