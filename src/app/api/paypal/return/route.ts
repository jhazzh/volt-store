import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPaypalOrders } from "@/lib/paypal";

/**
 * PayPal sends the buyer here after approval (?token=<paypal_order_id>).
 * Capturing server-side is the proof of payment — the capture response,
 * not the redirect, is what flips the order to 'paid'.
 * @param {NextRequest} request redirect back from PayPal
 * @return {Promise<Response>} redirect to the order page
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) redirect("/checkout");

  let orderId: string | undefined;
  let completed = false;
  try {
    const { result } = await createPaypalOrders().captureOrder({ id: token });
    const unit = result.purchaseUnits?.[0];
    // customId set at order creation — round-trips through PayPal's servers.
    orderId = unit?.payments?.captures?.[0]?.customId ?? unit?.customId ?? undefined;
    completed = result.status === "COMPLETED";
  } catch {
    // Declined / already captured — fall through to /checkout.
  }
  if (!orderId || !completed) redirect("/checkout");

  // Admin client: no user session guarantees here, RLS would block. The
  // status filter makes a replayed return URL idempotent.
  await createAdminClient()
    .from("orders")
    .update({ status: "paid", paypal_order_id: token })
    .eq("id", orderId)
    .eq("status", "pending");

  redirect(`/orders/${orderId}`);
}
