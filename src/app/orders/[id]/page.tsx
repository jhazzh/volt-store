import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClearCart } from "@/components/cart/clear-cart";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Order confirmed" };

type Props = { params: Promise<{ id: string }> };

type OrderRow = {
  id: string;
  total: number;
  status: string;
  created_at: string;
  order_items: { qty: number; unit_price: number; products: { name: string } | null }[];
};

export default async function OrderPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  // RLS: only the owner can read this order.
  const { data: order } = await supabase
    .from("orders")
    .select("id, total, status, created_at, order_items(qty, unit_price, products(name))")
    .eq("id", id)
    .maybeSingle<OrderRow>(); // many-to-one join — override supabase-js array inference
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <ClearCart />
      <h1 className="text-3xl font-bold">Thank you! 🎉</h1>
      <p className="mt-2 text-muted">
        Order <span className="font-mono text-sm">{order.id.slice(0, 8)}</span> confirmed.
      </p>

      <ul className="mx-auto mt-8 max-w-md space-y-2 text-left text-sm">
        {order.order_items.map((item, i) => (
          <li key={i} className="flex justify-between border-b border-border pb-2">
            <span>
              {item.products?.name} × {item.qty}
            </span>
            <span>{formatPrice(Number(item.unit_price) * item.qty)}</span>
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
