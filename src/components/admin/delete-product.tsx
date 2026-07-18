"use client";

import { useTransition } from "react";
import { deleteProduct } from "@/app/admin/products/actions";

/** Delete a product after a confirm prompt. */
export function DeleteProduct({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (confirm(`Delete "${name}"?`)) start(() => deleteProduct(id));
      }}
      className="text-red-500 hover:underline disabled:opacity-50"
    >
      {pending ? "…" : "Delete"}
    </button>
  );
}
