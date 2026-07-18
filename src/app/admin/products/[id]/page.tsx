import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { getCategories } from "@/lib/data";
import { updateProduct } from "@/app/admin/products/actions";
import { ProductForm } from "@/components/admin/product-form";
import type { Product } from "@/lib/types";

export const metadata: Metadata = { title: "Admin · Edit product" };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle<Product>();
  if (!product) notFound();

  const categories = await getCategories();
  const action = updateProduct.bind(null, id); // (prev, formData) => …

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold">Edit product</h1>
      <ProductForm action={action} categories={categories} product={product} />
    </div>
  );
}
