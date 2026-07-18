import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { getCategories } from "@/lib/data";
import { createCategory } from "@/app/admin/categories/actions";
import { CategoryForm } from "@/components/admin/category-form";
import { DeleteCategory } from "@/components/admin/delete-category";

export const metadata: Metadata = { title: "Admin · Categories" };

export default async function AdminCategoriesPage() {
  await requireAdmin();
  const categories = await getCategories();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold">Categories</h1>

      <div className="mt-6">
        <CategoryForm action={createCategory} submitLabel="Add" />
      </div>

      <table className="mt-8 w-full text-sm">
        <thead className="text-left text-muted">
          <tr className="border-b border-border">
            <th className="py-2">Name</th>
            <th>Slug</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {categories.map((c) => (
            <tr key={c.id} className="border-b border-border">
              <td className="py-2">{c.name}</td>
              <td className="text-muted">{c.slug}</td>
              <td className="flex justify-end gap-3 py-2">
                <Link
                  href={`/admin/categories/${c.id}`}
                  className="text-accent hover:underline"
                >
                  Edit
                </Link>
                <DeleteCategory id={c.id} name={c.name} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
