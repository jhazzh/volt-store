import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createXenditInvoices } from "@/lib/xendit";

/**
 * Xendit sends the buyer here after paying. The query param is untrusted —
 * we re-check the invoice status with Xendit's API before marking paid, so
 * this works on localhost too (no webhook tunnel needed).
 * @param {NextRequest} request redirect back from Xendit (?order=<order_id>)
 * @return {Promise<Response>} redirect to the order page
 */
export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get("order");
  if (!orderId) redirect("/checkout");

  let paid = false;
  let invoiceId: string | undefined;
  try {
    const invoices = await createXenditInvoices().getInvoices({ externalId: orderId });
    const invoice = invoices.find((i) => i.status === "PAID" || i.status === "SETTLED");
    paid = Boolean(invoice);
    invoiceId = invoice?.id;
  } catch {
    // API error — fall through; webhook can still settle it later.
  }
  if (!paid) redirect("/checkout");

  // Admin client: no user session guarantees here, RLS would block. The
  // status filter makes a replayed return URL idempotent.
  const admin = createAdminClient();
  await admin
    .from("orders")
    .update({ status: "paid", xendit_invoice_id: invoiceId })
    .eq("id", orderId)
    .eq("status", "pending");

  // Guest orders (no user) need the access token to view the confirmation.
  const { data: order } = await admin
    .from("orders")
    .select("user_id, access_token")
    .eq("id", orderId)
    .single();

  redirect(
    order && !order.user_id
      ? `/orders/${orderId}?token=${order.access_token}`
      : `/orders/${orderId}`
  );
}
