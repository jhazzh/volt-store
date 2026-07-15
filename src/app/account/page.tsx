import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/app/(auth)/actions";
import { PasswordForm } from "@/components/password-form";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Account" };

type OrderRow = {
  id: string;
  total: number;
  status: string;
  created_at: string;
  stripe_session_id: string | null;
  paypal_order_id: string | null;
  xendit_invoice_id: string | null;
};

/**
 * @param {OrderRow} order order row
 * @return {string} payment provider label ("—" until a provider confirms)
 */
function paymentMethod(order: OrderRow): string {
  if (order.stripe_session_id) return "Stripe";
  if (order.paypal_order_id) return "PayPal";
  if (order.xendit_invoice_id) return "Xendit";
  return "—";
}

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS: returns only the owner's orders.
  const { data: orders } = await supabase
    .from("orders")
    .select("id, total, status, created_at, stripe_session_id, paypal_order_id, xendit_invoice_id")
    .order("created_at", { ascending: false })
    .returns<OrderRow[]>();

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-bold">Account</h1>
      <p className="mt-2 text-sm text-muted">{user.email}</p>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Orders</h2>
        {!orders?.length ? (
          <p className="mt-3 text-sm text-muted">No orders yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/orders/${order.id}`}
                  className="flex justify-between rounded-md border border-border px-3 py-2 hover:border-accent transition-colors"
                >
                  <span className="font-mono">{order.id.slice(0, 8)}</span>
                  <span className="text-muted">
                    {new Date(order.created_at).toLocaleDateString()}
                  </span>
                  <span className="text-muted">{paymentMethod(order)}</span>
                  <span className="capitalize">{order.status.replace("_", " ")}</span>
                  <span>{formatPrice(Number(order.total))}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Change password</h2>
        <div className="mt-3 max-w-sm">
          <PasswordForm />
        </div>
      </section>

      <section className="mt-10">
        <form action={logout}>
          <button
            type="submit"
            className="rounded-lg border border-border px-4 py-2 text-sm hover:border-accent transition-colors"
          >
            Log out
          </button>
        </form>
      </section>
    </div>
  );
}
