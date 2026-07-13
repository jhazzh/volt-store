"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { authSchema } from "@/lib/validation";

export type AuthState = { error?: string };

/**
 * @param {AuthState} _prev previous form state
 * @param {FormData} formData email + password
 * @return {Promise<AuthState>} error state (redirects on success)
 */
export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = authSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Enter a valid email and password (min 8 chars)." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/checkout");
}

/**
 * @param {AuthState} _prev previous form state
 * @param {FormData} formData email + password
 * @return {Promise<AuthState>} error state (redirects on success)
 */
export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = authSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Enter a valid email and password (min 8 chars)." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp(parsed.data);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/checkout");
}

/**
 * @return {Promise<void>} signs out, redirects home
 */
export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
