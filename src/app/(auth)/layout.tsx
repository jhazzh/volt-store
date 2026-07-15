import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Auth pages are for guests only — logged-in users go home.
 * @param {{children: React.ReactNode}} props segment children
 * @return {Promise<React.ReactNode>} children or redirect
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");
  return <>{children}</>;
}
