"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { authSchema } from "@/lib/validation";

export type AuthState = { error?: string };

const LOGIN_ATTEMPTS_PER_HOUR = 10;

async function loginAllowed(): Promise<boolean> {
  const ip =
    (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { data: allowed, error } = await createAdminClient().rpc("bump_rate_limit", {
    p_key: `login:${ip}`,
    p_window: "1 hour",
    p_max: LOGIN_ATTEMPTS_PER_HOUR,
  });

  // An unavailable limiter must not turn into an authentication bypass.
  return !error && allowed === true;
}

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

  if (!(await loginAllowed())) {
    return { error: "Too many login attempts. Try again later." };
  }

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
