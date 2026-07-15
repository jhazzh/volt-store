"use server";

import { createClient } from "@/lib/supabase/server";
import { authSchema } from "@/lib/validation";

export type PasswordState = { error?: string; success?: boolean };

/**
 * @param {PasswordState} _prev previous form state
 * @param {FormData} formData new password
 * @return {Promise<PasswordState>} error or success state
 */
export async function updatePassword(
  _prev: PasswordState,
  formData: FormData
): Promise<PasswordState> {
  const parsed = authSchema.shape.password.safeParse(formData.get("password"));
  if (!parsed.success) return { error: "Password must be 8–72 characters." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) return { error: error.message };

  return { success: true };
}
