"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { embedProduct } from "@/lib/embed";
import { generateDescription } from "@/lib/product-description";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { productSchema } from "@/lib/validation";

const BUCKET = "digital-goods";

type State = { error?: string };

/** Build a normalized product row from the submitted form. */
function parseForm(formData: FormData) {
  const raw = {
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description") ?? "",
    price: formData.get("price"),
    image_url: formData.get("image_url") ?? "",
    category_id: (formData.get("category_id") as string) || null,
    product_type: formData.get("product_type"),
    stock: formData.get("stock") || undefined,
    delivery_type: (formData.get("delivery_type") as string) || null,
    delivery_value: (formData.get("delivery_value") as string) || null,
  };
  return productSchema.safeParse(raw);
}

/** Upload a digital file to the private bucket; returns its path. */
async function uploadFile(slug: string, file: File): Promise<string> {
  const path = `products/${slug}/${file.name}`;
  const { error } = await createAdminClient()
    .storage.from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return path;
}

/** Shape the parsed form into a DB row, resolving digital delivery + file. */
async function toRow(
  parsed: ReturnType<typeof parseForm>,
  formData: FormData
): Promise<{ row?: Record<string, unknown>; error?: string }> {
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;

  const row: Record<string, unknown> = {
    name: v.name,
    slug: v.slug,
    description: v.description,
    price: v.price,
    image_url: v.image_url || null,
    category_id: v.category_id ?? null,
    product_type: v.product_type,
  };

  if (v.product_type === "simple") {
    row.stock = v.stock ?? 0;
    row.delivery_type = null;
    row.delivery_value = null;
  } else {
    row.stock = null; // digital = unlimited
    row.delivery_type = v.delivery_type;
    // For file delivery, an uploaded file overrides a typed path.
    const file = formData.get("file") as File | null;
    if (v.delivery_type === "file" && file && file.size > 0) {
      row.delivery_value = await uploadFile(v.slug, file);
    } else {
      row.delivery_value = v.delivery_value;
    }
    if (!row.delivery_value) return { error: "Digital product needs a file, key, or URL" };
  }
  return { row };
}

/** Read parallel spec_key[]/spec_value[] fields into ordered spec rows. */
function parseSpecs(
  productId: string,
  formData: FormData
): { product_id: string; key: string; value: string; position: number }[] {
  const keys = formData.getAll("spec_key") as string[];
  const values = formData.getAll("spec_value") as string[];
  const rows: { product_id: string; key: string; value: string; position: number }[] = [];
  keys.forEach((k, i) => {
    const key = k.trim();
    const value = (values[i] ?? "").trim();
    if (key && value) {
      rows.push({ product_id: productId, key, value, position: rows.length });
    }
  });
  return rows;
}

/** Replace a product's specs with the submitted set (delete-all + reinsert). */
async function saveSpecs(
  supabase: Awaited<ReturnType<typeof createClient>>,
  productId: string,
  formData: FormData
): Promise<string | undefined> {
  const { error: delError } = await supabase
    .from("product_specs")
    .delete()
    .eq("product_id", productId);
  if (delError) return delError.message;

  const rows = parseSpecs(productId, formData);
  if (rows.length === 0) return undefined;
  const { error } = await supabase.from("product_specs").insert(rows);
  return error?.message;
}

export async function createProduct(_prev: State, formData: FormData): Promise<State> {
  await requireAdmin();
  const built = await toRow(parseForm(formData), formData);
  if (!built.row) return { error: built.error };

  const row = built.row;
  const supabase = await createClient(); // admin RLS gates the write
  const { data, error } = await supabase
    .from("products")
    .insert(row)
    .select("id")
    .single();
  if (error) return { error: error.message };

  const specError = await saveSpecs(supabase, data.id, formData);
  if (specError) return { error: specError };

  // Off the response path — the admin shouldn't wait on the search index.
  after(() => embedProduct(data.id, row.name as string, row.description as string));

  revalidatePath("/admin/products");
  revalidatePath("/products");
  redirect("/admin/products");
}

export async function updateProduct(
  id: string,
  _prev: State,
  formData: FormData
): Promise<State> {
  await requireAdmin();
  const built = await toRow(parseForm(formData), formData);
  if (!built.row) return { error: built.error };

  const row = built.row;
  const supabase = await createClient();
  // Read the old text first: re-embedding is only worth it if it changed.
  const { data: before } = await supabase
    .from("products")
    .select("name, description")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("products").update(row).eq("id", id);
  if (error) return { error: error.message };

  const specError = await saveSpecs(supabase, id, formData);
  if (specError) return { error: specError };

  const name = row.name as string;
  const description = row.description as string;
  if (!before || before.name !== name || before.description !== description) {
    after(() => embedProduct(id, name, description));
  }

  revalidatePath("/admin/products");
  revalidatePath("/products");
  redirect("/admin/products");
}

type DraftState = { description?: string; error?: string };

/** Draft a product description from the form's current name/category/price. */
export async function draftDescription(
  _prev: DraftState,
  formData: FormData
): Promise<DraftState> {
  await requireAdmin();
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Enter a name first" };

  const categoryId = (formData.get("category_id") as string) || null;
  let category: string | null = null;
  if (categoryId) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("categories")
      .select("name")
      .eq("id", categoryId)
      .maybeSingle();
    category = data?.name ?? null;
  }

  const priceRaw = formData.get("price") as string;
  const price = priceRaw ? Number(priceRaw) : null;

  const description = await generateDescription({
    name,
    category,
    price: Number.isFinite(price) ? price : null,
    productType: (formData.get("product_type") as string) || null,
  });

  if (!description) return { error: "Couldn't generate — try again" };
  return { description };
}

export async function deleteProduct(id: string): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/products");
  revalidatePath("/products");
}
