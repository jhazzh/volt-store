"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import type { SpecKeyType } from "@/lib/types";

type State = { error?: string };

const TYPES: SpecKeyType[] = ["text", "number", "boolean", "enum"];

/** Parse name, type, and (for enum) newline-separated allowed values. */
function parse(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const type = formData.get("type") as SpecKeyType;
  const allowed = ((formData.get("allowed_values") as string) ?? "")
    .split("\n")
    .map((v) => v.trim())
    .filter(Boolean);

  if (!name) return { error: "Name is required" as const };
  if (!TYPES.includes(type)) return { error: "Invalid type" as const };
  if (type === "enum" && allowed.length === 0) {
    return { error: "Enum keys need at least one value" as const };
  }
  return { name, type, allowed };
}

function revalidate() {
  revalidatePath("/admin/spec-keys");
  revalidatePath("/admin/products");
}

/** Replace an enum key's allowed values with the submitted set. */
async function saveValues(
  supabase: Awaited<ReturnType<typeof createClient>>,
  key: string,
  type: SpecKeyType,
  allowed: string[]
): Promise<string | undefined> {
  await supabase.from("spec_key_values").delete().eq("key", key);
  if (type !== "enum" || allowed.length === 0) return undefined;
  const rows = allowed.map((value, position) => ({ key, value, position }));
  const { error } = await supabase.from("spec_key_values").insert(rows);
  return error?.message;
}

export async function createSpecKey(_prev: State, formData: FormData): Promise<State> {
  await requireAdmin();
  const p = parse(formData);
  if ("error" in p) return { error: p.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("spec_keys")
    .insert({ name: p.name, type: p.type });
  if (error) return { error: error.message };

  const valError = await saveValues(supabase, p.name, p.type, p.allowed);
  if (valError) return { error: valError };

  revalidate();
  return {};
}

export async function updateSpecKey(
  name: string,
  _prev: State,
  formData: FormData
): Promise<State> {
  await requireAdmin();
  const p = parse(formData);
  if ("error" in p) return { error: p.error };

  const supabase = await createClient();
  // Renaming cascades to product_specs and spec_key_values via the FKs.
  const { error } = await supabase
    .from("spec_keys")
    .update({ name: p.name, type: p.type })
    .eq("name", name);
  if (error) return { error: error.message };

  const valError = await saveValues(supabase, p.name, p.type, p.allowed);
  if (valError) return { error: valError };

  revalidate();
  return {};
}

// FK from product_specs is ON DELETE RESTRICT, so a key in use can't be deleted.
export async function deleteSpecKey(name: string): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("spec_keys").delete().eq("name", name);
  if (error) throw new Error(error.message);
  revalidate();
}
