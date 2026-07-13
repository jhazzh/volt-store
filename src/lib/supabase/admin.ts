import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Admin client — secret key, bypasses RLS. Seed/admin tasks only.
 * `server-only` makes any client-side import a build error.
 * @return {ReturnType<typeof createSupabaseClient>} Supabase admin client
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } }
  );
}
