import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Gate a page/action to admins only. Redirects non-admins.
 * Backed by user_roles + the roles table (see is_admin() in the DB).
 * @return {Promise<{ id: string }>} the admin user
 */
export async function requireAdmin(): Promise<{ id: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // A row exists only if the user has a role; check it's admin.
  const { data: role } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("id", user.id)
    .maybeSingle<{ roles: { name: string } | null }>(); // FK join is one-to-one

  if (role?.roles?.name !== "admin") redirect("/");
  return { id: user.id };
}
