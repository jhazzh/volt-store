"use client";

import { useTransition } from "react";
import { deleteCategory } from "@/app/admin/categories/actions";

/** Delete a category after confirming. Products keep, just lose the category. */
export function DeleteCategory({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (confirm(`Delete "${name}"? Products keep, but lose this category.`))
          start(() => deleteCategory(id));
      }}
      className="text-red-500 hover:underline disabled:opacity-50"
    >
      {pending ? "…" : "Delete"}
    </button>
  );
}
