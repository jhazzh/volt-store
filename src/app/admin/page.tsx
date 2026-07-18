import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  await requireAdmin(); // redirects non-admins

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-bold">Admin</h1>
      <ul className="mt-4 space-y-1">
        <li>
          <Link href="/admin/products" className="text-accent hover:underline">
            Manage products →
          </Link>
        </li>
        <li>
          <Link href="/admin/categories" className="text-accent hover:underline">
            Manage categories →
          </Link>
        </li>
      </ul>
    </div>
  );
}
