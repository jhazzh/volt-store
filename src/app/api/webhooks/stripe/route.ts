import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createStripeClient } from "@/lib/stripe";

/**
 * Stripe webhook — the only place an order becomes 'paid'. The success page
 * redirect can be faked; the signed event cannot. Signature check reads the
 * raw body, so no parsing before verification.
 *
 * Local dev: stripe listen --forward-to localhost:3000/api/webhooks/stripe
 * @param {Request} request incoming Stripe event
 * @return {Promise<Response>} 200 on handled, 400 on bad signature
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return Response.json({ error: "STRIPE_WEBHOOK_SECRET not configured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = createStripeClient().webhooks.constructEvent(
      await request.text(),
      signature,
      secret
    );
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.expired"
  ) {
    const session = event.data.object;
    const orderId = session.metadata?.order_id;
    if (!orderId) return Response.json({ error: "Missing order_id" }, { status: 400 });

    const status = event.type === "checkout.session.completed" ? "paid" : "cancelled";
    // Admin client: webhook has no user session, RLS would block. The
    // status filter makes retried events idempotent.
    const { error } = await createAdminClient()
      .from("orders")
      .update({ status, stripe_session_id: session.id })
      .eq("id", orderId)
      .eq("status", "pending");
    if (error) return Response.json({ error: "DB update failed" }, { status: 500 });
  }

  return Response.json({ received: true });
}
