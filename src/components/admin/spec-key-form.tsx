"use client";

import { useActionState, useState } from "react";
import type { SpecKey, SpecKeyType } from "@/lib/types";

type Action = (prev: { error?: string }, formData: FormData) => Promise<{ error?: string }>;

/** Create/edit spec key: name, type, and allowed values for enum keys. */
export function SpecKeyForm({
  action,
  specKey,
  submitLabel,
}: {
  action: Action;
  specKey?: SpecKey;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [type, setType] = useState<SpecKeyType>(specKey?.type ?? "text");
  // Re-sync when the saved key's type changes underneath us (revalidation
  // streams fresh props without remounting the form), so the select doesn't
  // snap back to its first option after saving.
  const [lastProp, setLastProp] = useState(specKey?.type);
  if (specKey?.type !== lastProp) {
    setLastProp(specKey?.type);
    setType(specKey?.type ?? "text");
  }
  const field = "rounded-md border border-border bg-card px-3 py-2 text-sm";

  return (
    <form action={formAction} className="flex flex-wrap items-start gap-2">
      <input
        name="name"
        defaultValue={specKey?.name}
        placeholder="Key (e.g. Material)"
        required
        className={field}
      />
      <select
        name="type"
        value={type}
        onChange={(e) => setType(e.target.value as SpecKeyType)}
        className={field}
      >
        <option value="text">Text</option>
        <option value="number">Number</option>
        <option value="boolean">Yes / No</option>
        <option value="enum">Options — pick one</option>
        <option value="multiselect">Options — pick many</option>
      </select>
      {(type === "enum" || type === "multiselect") && (
        <textarea
          name="allowed_values"
          defaultValue={specKey?.allowed_values.join("\n")}
          placeholder="One option per line"
          rows={4}
          className={`${field} w-full`}
        />
      )}
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
