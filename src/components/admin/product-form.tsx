"use client";

import { useActionState, useState } from "react";
import type { Category, Product } from "@/lib/types";

type Action = (prev: { error?: string }, formData: FormData) => Promise<{ error?: string }>;

/**
 * Shared create/edit product form. Toggles simple (stock) vs digital
 * (delivery type + file/key/url) fields.
 * @param {{ action: Action; categories: Category[]; product?: Product }} props
 */
export function ProductForm({
  action,
  categories,
  product,
}: {
  action: Action;
  categories: Category[];
  product?: Product;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [type, setType] = useState<"simple" | "digital">(
    product?.product_type ?? "simple"
  );
  const [delivery, setDelivery] = useState(product?.delivery_type ?? "file");

  const field = "mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm";
  const label = "block text-sm font-medium";

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className={label}>Name</label>
        <input name="name" defaultValue={product?.name} required className={field} />
      </div>
      <div>
        <label className={label}>Slug</label>
        <input
          name="slug"
          defaultValue={product?.slug}
          required
          pattern="[a-z0-9-]+"
          className={field}
        />
      </div>
      <div>
        <label className={label}>Description</label>
        <textarea
          name="description"
          defaultValue={product?.description}
          rows={3}
          className={field}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Price (USD)</label>
          <input
            name="price"
            type="number"
            step="0.01"
            min="0"
            defaultValue={product?.price}
            required
            className={field}
          />
        </div>
        <div>
          <label className={label}>Category</label>
          <select
            name="category_id"
            defaultValue={product?.category_id ?? ""}
            className={field}
          >
            <option value="">— none —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className={label}>Image URL</label>
        <input
          name="image_url"
          type="url"
          defaultValue={product?.image_url ?? ""}
          placeholder="https://…"
          className={field}
        />
      </div>

      <div>
        <label className={label}>Type</label>
        <select
          name="product_type"
          value={type}
          onChange={(e) => setType(e.target.value as "simple" | "digital")}
          className={field}
        >
          <option value="simple">Simple (physical)</option>
          <option value="digital">Digital</option>
        </select>
      </div>

      {type === "simple" ? (
        <div>
          <label className={label}>Stock</label>
          <input
            name="stock"
            type="number"
            min="0"
            defaultValue={product?.stock ?? 0}
            className={field}
          />
        </div>
      ) : (
        <div className="space-y-4 rounded-md border border-border p-4">
          <div>
            <label className={label}>Delivery</label>
            <select
              name="delivery_type"
              value={delivery}
              onChange={(e) => setDelivery(e.target.value as typeof delivery)}
              className={field}
            >
              <option value="file">File (PDF upload)</option>
              <option value="key">Key / code</option>
              <option value="access">Access</option>
              <option value="url">External URL</option>
            </select>
          </div>
          {delivery === "file" ? (
            <div>
              <label className={label}>File</label>
              <input name="file" type="file" accept="application/pdf" className={field} />
              {product?.delivery_value && (
                <p className="mt-1 text-xs text-muted">Current: {product.delivery_value}</p>
              )}
            </div>
          ) : (
            <div>
              <label className={label}>
                {delivery === "url" ? "URL" : "Code / value"}
              </label>
              <input
                name="delivery_value"
                defaultValue={product?.delivery_value ?? ""}
                className={field}
              />
            </div>
          )}
        </div>
      )}

      {state.error && <p className="text-sm text-red-500">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-accent px-6 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Saving…" : product ? "Save changes" : "Create product"}
      </button>
    </form>
  );
}
