import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/admin";
import { getCategories, getSpecKeys } from "@/lib/data";
import { createProduct } from "@/app/admin/products/actions";
import { ProductForm } from "@/components/admin/product-form";

export const metadata: Metadata = { title: "Admin · New product" };

export default async function NewProductPage() {
  await requireAdmin();
  const [categories, specKeys] = await Promise.all([getCategories(), getSpecKeys()]);

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold">New product</h1>
      <ProductForm action={createProduct} categories={categories} specKeys={specKeys} />
    </div>
  );
}
