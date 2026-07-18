"use client";

import { useActionState } from "react";
import type { Category } from "@/lib/types";

type Action = (prev: { error?: string }, formData: FormData) => Promise<{ error?: string }>;

/** Create/edit category form (name + slug). */
export function CategoryForm({
  action,
  category,
  submitLabel,
}: {
  action: Action;
  category?: Category;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const field = "rounded-md border border-border bg-card px-3 py-2 text-sm";

  return (
    <form action={formAction} className="flex flex-wrap items-start gap-2">
      <input
        name="name"
        defaultValue={category?.name}
        placeholder="Name"
        required
        className={field}
      />
      <input
        name="slug"
        defaultValue={category?.slug}
        placeholder="slug"
        required
        pattern="[a-z0-9\-]+"
        className={field}
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "…" : submitLabel}
      </button>
      {state.error && <p className="w-full text-sm text-red-500">{state.error}</p>}
    </form>
  );
}
