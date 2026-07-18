import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { updateCategory } from "@/app/admin/categories/actions";
import { CategoryForm } from "@/components/admin/category-form";
import type { Category } from "@/lib/types";

export const metadata: Metadata = { title: "Admin · Edit category" };

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const supabase = await createClient();
  const { data: category } = await supabase
    .from("categories")
    .select("*")
    .eq("id", id)
    .maybeSingle<Category>();
  if (!category) notFound();

  const action = updateCategory.bind(null, id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold">Edit category</h1>
      <CategoryForm action={action} category={category} submitLabel="Save" />
    </div>
  );
}
