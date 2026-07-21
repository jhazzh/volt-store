"use client";

import { useState, useTransition } from "react";
import { deleteSpecKey } from "@/app/admin/spec-keys/actions";

/** Delete a spec key. Blocked by the DB if any product still uses it. */
export function DeleteSpecKey({ name }: { name: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <span className="flex items-center gap-2">
      <button
        disabled={pending}
        onClick={() => {
          if (!confirm(`Delete "${name}"?`)) return;
          setError(undefined);
          start(async () => {
            try {
              await deleteSpecKey(name);
            } catch {
              setError("In use — remove it from products first");
            }
          });
        }}
        className="text-red-500 hover:underline disabled:opacity-50"
      >
        {pending ? "…" : "Delete"}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </span>
  );
}
