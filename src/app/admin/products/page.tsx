import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/format";
import { DeleteProduct } from "@/components/admin/delete-product";

export const metadata: Metadata = { title: "Admin · Products" };

type Row = {
  id: string;
  name: string;
  price: number;
  stock: number | null;
  product_type: string;
};

export default async function AdminProductsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, name, price, stock, product_type")
    .order("name")
    .returns<Row[]>();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <Link
          href="/admin/products/new"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90"
        >
          New product
        </Link>
      </div>

      <table className="mt-6 w-full text-sm">
        <thead className="text-left text-muted">
          <tr className="border-b border-border">
            <th className="py-2">Name</th>
            <th>Type</th>
            <th>Price</th>
            <th>Stock</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {(products ?? []).map((p) => (
            <tr key={p.id} className="border-b border-border">
              <td className="py-2">{p.name}</td>
              <td>{p.product_type}</td>
              <td>{formatPrice(p.price)}</td>
              <td>{p.stock ?? "∞"}</td>
              <td className="flex justify-end gap-3 py-2">
                <Link href={`/admin/products/${p.id}`} className="text-accent hover:underline">
                  Edit
                </Link>
                <DeleteProduct id={p.id} name={p.name} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
