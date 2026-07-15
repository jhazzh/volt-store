import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createXenditInvoices } from "@/lib/xendit";

const callbackSchema = z.object({
  id: z.string(),
  external_id: z.string(), // our order id
  status: z.enum(["PAID", "SETTLED", "EXPIRED"]).or(z.string()),
});

// Refund callbacks are wrapped, unlike the flat invoice callback.
const refundSchema = z.object({
  event: z.string(),
  data: z.object({
    invoice_id: z.string().optional(),
    amount: z.number().optional(),
  }),
});

/**
 * Constant-time compare — a plain `!==` leaks the token through timing.
 * @param {string | null} a candidate
 * @param {string} b expected token
 * @return {boolean} true when equal
 */
function tokenMatches(a: string | null, b: string): boolean {
  if (!a) return false;
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Xendit invoice callback — authenticated by the account's callback
 * verification token, not a signature. Set the URL in Xendit Dashboard →
 * Settings → Developers → Callbacks → Invoices.
 * @param {Request} request incoming Xendit callback
 * @return {Promise<Response>} 200 on handled, 401 on bad token
 */
export async function POST(request: Request) {
  const token = process.env.XENDIT_CALLBACK_TOKEN;
  if (!token) {
    return Response.json({ error: "XENDIT_CALLBACK_TOKEN not configured" }, { status: 500 });
  }
  if (!tokenMatches(request.headers.get("x-callback-token"), token)) {
    return Response.json({ error: "Invalid token" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  const refund = refundSchema.safeParse(body);
  if (refund.success && refund.data.event.startsWith("refund.")) {
    if (refund.data.event === "refund.succeeded" && refund.data.data.invoice_id) {
      const { invoice_id, amount } = refund.data.data;
      // Full vs partial: compare this refund to the invoice amount (IDR).
      // Limitation: several partials that sum to full still read as partial.
      const invoice = await createXenditInvoices().getInvoiceById({ invoiceId: invoice_id });
      const status =
        amount != null && amount >= invoice.amount ? "refunded" : "partially_refunded";
      // partially_refunded stays updatable: later refunds can complete it.
      const { error } = await createAdminClient()
        .from("orders")
        .update({ status })
        .eq("xendit_invoice_id", invoice_id)
        .in("status", ["paid", "partially_refunded"]);
      if (error) return Response.json({ error: "DB update failed" }, { status: 500 });
    }
    return Response.json({ received: true });
  }

  const parsed = callbackSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Bad payload" }, { status: 400 });

  const { id, external_id, status } = parsed.data;
  if (status === "PAID" || status === "SETTLED" || status === "EXPIRED") {
    const next = status === "EXPIRED" ? "cancelled" : "paid";
    // Admin client: no user session, RLS would block. Status filter = idempotent.
    const { error } = await createAdminClient()
      .from("orders")
      .update({ status: next, xendit_invoice_id: id })
      .eq("id", external_id)
      .eq("status", "pending");
    if (error) return Response.json({ error: "DB update failed" }, { status: 500 });
  }

  return Response.json({ received: true });
}
