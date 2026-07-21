import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { getSpecKeys } from "@/lib/data";
import { updateSpecKey } from "@/app/admin/spec-keys/actions";
import { SpecKeyForm } from "@/components/admin/spec-key-form";

export const metadata: Metadata = { title: "Admin · Edit spec key" };

export default async function EditSpecKeyPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  await requireAdmin();
  const { name } = await params;
  const decoded = decodeURIComponent(name);

  const specKey = (await getSpecKeys()).find((k) => k.name === decoded);
  if (!specKey) notFound();

  const action = updateSpecKey.bind(null, decoded);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold">Edit spec key</h1>
      <SpecKeyForm action={action} specKey={specKey} submitLabel="Save" />
    </div>
  );
}
