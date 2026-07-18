import { createClient } from "@supabase/supabase-js";

// Usage: npm run make:admin -- you@example.com
const email = process.argv[2];
if (!email) {
  console.error("Usage: npm run make:admin -- <email>");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } }
);

const { data, error } = await supabase.auth.admin.listUsers();
if (error) {
  console.error("Failed to list users:", error.message);
  process.exit(1);
}
const user = data.users.find((u) => u.email === email);
if (!user) {
  console.error(`No user with email ${email}`);
  process.exit(1);
}

const { data: role, error: roleErr } = await supabase
  .from("roles")
  .select("id")
  .eq("name", "admin")
  .single();
if (roleErr || !role) {
  console.error("No 'admin' role found. Run migrations first.");
  process.exit(1);
}

const { error: upErr } = await supabase
  .from("user_roles")
  .upsert({ id: user.id, role_id: role.id });
if (upErr) {
  console.error("Failed to set admin:", upErr.message);
  process.exit(1);
}
console.log(`${email} is now an admin.`);
