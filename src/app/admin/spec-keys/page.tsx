import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { getSpecKeys } from "@/lib/data";
import { createSpecKey } from "@/app/admin/spec-keys/actions";
import { SpecKeyForm } from "@/components/admin/spec-key-form";
import { DeleteSpecKey } from "@/components/admin/delete-spec-key";

export const metadata: Metadata = { title: "Admin · Spec keys" };

export default async function AdminSpecKeysPage() {
  await requireAdmin();
  const specKeys = await getSpecKeys();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold">Spec keys</h1>
      <p className="mt-1 text-sm text-muted">
        The vocabulary of product spec keys. Enum keys define their allowed values.
      </p>

      <div className="mt-6">
        <SpecKeyForm action={createSpecKey} submitLabel="Add" />
      </div>

      <table className="mt-8 w-full text-sm">
        <thead className="text-left text-muted">
          <tr className="border-b border-border">
            <th className="py-2">Key</th>
            <th>Type</th>
            <th>Options</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {specKeys.map((k) => (
            <tr key={k.name} className="border-b border-border">
              <td className="py-2">{k.name}</td>
              <td className="text-muted">{k.type}</td>
              <td className="text-muted">
                {k.allowed_values.length > 0 ? k.allowed_values.join(", ") : "—"}
              </td>
              <td className="flex justify-end gap-3 py-2">
                <Link
                  href={`/admin/spec-keys/${encodeURIComponent(k.name)}`}
                  className="text-accent hover:underline"
                >
                  Edit
                </Link>
                <DeleteSpecKey name={k.name} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
