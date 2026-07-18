"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { categorySchema } from "@/lib/validation";

type State = { error?: string };

function parse(formData: FormData) {
  return categorySchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
  });
}

function revalidate() {
  revalidatePath("/admin/categories");
  revalidatePath("/products"); // category filter list
}

export async function createCategory(_prev: State, formData: FormData): Promise<State> {
  await requireAdmin();
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient(); // admin RLS gates the write
  const { error } = await supabase.from("categories").insert(parsed.data);
  if (error) return { error: error.message };

  revalidate();
  return {};
}

export async function updateCategory(
  id: string,
  _prev: State,
  formData: FormData
): Promise<State> {
  await requireAdmin();
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("categories").update(parsed.data).eq("id", id);
  if (error) return { error: error.message };

  revalidate();
  return {};
}

// Product FK is ON DELETE SET NULL, so products just lose their category.
export async function deleteCategory(id: string): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
}
