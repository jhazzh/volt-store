import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const callbackSchema = z.object({
  id: z.string(),
  external_id: z.string(), // our order id
  status: z.enum(["PAID", "SETTLED", "EXPIRED"]).or(z.string()),
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

  const parsed = callbackSchema.safeParse(await request.json().catch(() => null));
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
