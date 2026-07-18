import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/admin";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  await requireAdmin(); // redirects non-admins

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-bold">Admin ✓</h1>
      <p className="mt-2 text-muted">Product management coming next.</p>
    </div>
  );
}
