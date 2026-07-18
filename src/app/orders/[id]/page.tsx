import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ClearCart } from "@/components/cart/clear-cart";
import { DownloadButton } from "@/components/download-button";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Order confirmed" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
};

const ORDER_SELECT =
  "id, total, status, created_at, order_items(id, qty, unit_price, products(name, product_type))";

const TOKEN_GUESSES_PER_HOUR = 30;

function isLockedOut(guesses: { count: number; window_start: string } | null) {
  return (
    !!guesses &&
    guesses.count >= TOKEN_GUESSES_PER_HOUR &&
    Date.now() - new Date(guesses.window_start).getTime() < 3_600_000
  );
}

type OrderRow = {
  id: string;
  total: number;
  status: string;
  created_at: string;
  order_items: {
    id: string;
    qty: number;
    unit_price: number;
    products: { name: string; product_type: string } | null;
  }[];
};

export default async function OrderPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { token } = await searchParams;
  const supabase = await createClient();

  // RLS: only the owner can read this order.
  let { data: order } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("id", id)
    .maybeSingle<OrderRow>(); // many-to-one join — override supabase-js array inference

  // Guest orders have no owner session; the access token from the success URL
  // grants read. Scoped to user_id null so a leaked URL never exposes an
  // account order.
  if (!order && typeof token === "string" && token) {
    const admin = createAdminClient();
    const ip =
      (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const key = `order-token:${ip}`;

    // Only wrong tokens count (bumped below) — a real buyer refreshing their
    // confirmation never locks themselves out.
    const { data: guesses } = await admin
      .from("rate_limits")
      .select("count, window_start")
      .eq("key", key)
      .maybeSingle();
    if (!isLockedOut(guesses)) {
      ({ data: order } = await admin
        .from("orders")
        .select(ORDER_SELECT)
        .eq("id", id)
        .eq("access_token", token)
        .is("user_id", null)
        .maybeSingle<OrderRow>());
      if (!order) {
        await admin.rpc("bump_rate_limit", {
          p_key: key,
          p_window: "1 hour",
          p_max: TOKEN_GUESSES_PER_HOUR,
        });
      }
    }
  }
  if (!order) notFound();

  // 'pending' right after Stripe redirect = webhook not landed yet.
  const headings: Record<string, string> = {
    paid: "Thank you! 🎉",
    pending: "Payment processing…",
    refunded: "Order refunded",
    partially_refunded: "Order partially refunded",
    cancelled: "Order cancelled",
  };
  const heading = headings[order.status] ?? "Order";

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      {(order.status === "paid" || order.status === "pending") && <ClearCart />}
      <h1 className="text-3xl font-bold">{heading}</h1>
      <p className="mt-2 text-muted">
        Order <span className="font-mono text-sm">{order.id.slice(0, 8)}</span>
        {order.status === "paid" ? " confirmed." : ` is ${order.status.replace("_", " ")}.`}
      </p>

      <ul className="mx-auto mt-8 max-w-md space-y-2 text-left text-sm">
        {order.order_items.map((item, i) => (
          <li key={i} className="flex items-center justify-between border-b border-border pb-2">
            <span>
              {item.products?.name} × {item.qty}
            </span>
            <span className="flex items-center gap-3">
              {order.status === "paid" &&
                item.products?.product_type === "digital" && (
                  <DownloadButton orderItemId={item.id} token={token} />
                )}
              {formatPrice(Number(item.unit_price) * item.qty)}
            </span>
          </li>
        ))}
        <li className="flex justify-between pt-1 font-semibold">
          <span>Total</span>
          <span>{formatPrice(Number(order.total))}</span>
        </li>
      </ul>

      <Link
        href="/products"
        className="mt-10 inline-block rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground hover:opacity-90"
      >
        Continue shopping
      </Link>
    </div>
  );
}
