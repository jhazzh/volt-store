"use client";

import { useActionState, useState } from "react";
import { draftDescription } from "@/app/admin/products/actions";
import type { Category, Product, ProductSpec, SpecKey } from "@/lib/types";

type Action = (prev: { error?: string }, formData: FormData) => Promise<{ error?: string }>;

/**
 * Shared create/edit product form. Toggles simple (stock) vs digital
 * (delivery type + file/key/url) fields.
 * @param {{ action: Action; categories: Category[]; product?: Product }} props
 */
export function ProductForm({
  action,
  categories,
  specKeys,
  product,
}: {
  action: Action;
  categories: Category[];
  specKeys: SpecKey[];
  product?: Product;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [type, setType] = useState<"simple" | "digital">(
    product?.product_type ?? "simple"
  );
  const [delivery, setDelivery] = useState(product?.delivery_type ?? "file");

  // AI description drafting shares the same form's fields (name, category, …).
  const [description, setDescription] = useState(product?.description ?? "");
  const [draft, draftAction, drafting] = useActionState(draftDescription, {});
  // Adopt a freshly generated draft without an effect: React allows setState
  // during render when guarded by a state comparison. Tracking the last applied
  // draft keeps re-renders from clobbering the admin's manual edits.
  const [applied, setApplied] = useState<string | undefined>(undefined);
  if (draft.description && draft.description !== applied) {
    setApplied(draft.description);
    setDescription(draft.description);
  }

  // Dynamic spec rows (key/value). Submitted as parallel spec_key[]/spec_value[].
  const [specs, setSpecs] = useState<ProductSpec[]>(product?.specs ?? []);
  const setSpec = (i: number, patch: Partial<ProductSpec>) =>
    setSpecs((s) => s.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  const addSpec = () => setSpecs((s) => [...s, { key: "", value: "" }]);
  const removeSpec = (i: number) =>
    setSpecs((s) => s.filter((_, j) => j !== i));

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
          pattern="[a-z0-9\-]+"
          className={field}
        />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label className={label}>Description</label>
          <button
            type="submit"
            formAction={draftAction}
            formNoValidate
            disabled={drafting}
            className="text-xs font-medium text-accent hover:underline disabled:opacity-50"
          >
            {drafting ? "Generating…" : "✨ Generate with AI"}
          </button>
        </div>
        <textarea
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className={field}
        />
        {draft.error && <p className="mt-1 text-xs text-red-500">{draft.error}</p>}
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

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className={label}>Specs</label>
          <button
            type="button"
            onClick={addSpec}
            className="text-xs font-medium text-accent hover:underline"
          >
            + Add spec
          </button>
        </div>
        {specs.length === 0 && (
          <p className="text-xs text-muted">No specs. Add rows like Material → Aluminum.</p>
        )}
        {specs.map((spec, i) => {
          const known = specKeys.find((k) => k.name === spec.key);
          // A row is "adding a new key" when its key isn't in the vocabulary.
          const isNewKey = spec.key.trim() !== "" && !known;
          const valueProps = {
            name: "spec_value",
            value: spec.value,
            className: `${field} mt-0 flex-1`,
          };
          return (
          <div key={i} className="flex gap-2">
            {isNewKey ? (
              <input
                name="spec_key"
                value={spec.key.trimStart()}
                onChange={(e) => setSpec(i, { key: e.target.value })}
                placeholder="New key (free-text value)"
                autoFocus
                className={`${field} mt-0 flex-1`}
              />
            ) : (
              <select
                name="spec_key"
                value={spec.key}
                onChange={(e) =>
                  setSpec(i, {
                    key: e.target.value === "__new" ? " " : e.target.value,
                    value: "", // reset value when the key (and its type) changes
                  })
                }
                className={`${field} mt-0 flex-1`}
              >
                <option value="">— select key —</option>
                {specKeys.map((k) => (
                  <option key={k.name} value={k.name}>
                    {k.name}
                  </option>
                ))}
                <option value="__new">+ New key…</option>
              </select>
            )}
            {known?.type === "enum" ? (
              <select
                {...valueProps}
                onChange={(e) => setSpec(i, { value: e.target.value })}
              >
                <option value="">— select value —</option>
                {known.allowed_values.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            ) : known?.type === "boolean" ? (
              <select
                {...valueProps}
                onChange={(e) => setSpec(i, { value: e.target.value })}
              >
                <option value="">— select —</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            ) : (
              <input
                {...valueProps}
                type={known?.type === "number" ? "number" : "text"}
                onChange={(e) => setSpec(i, { value: e.target.value })}
                placeholder="Value"
              />
            )}
            <button
              type="button"
              onClick={() => removeSpec(i)}
              aria-label="Remove spec"
              className="shrink-0 rounded-md border border-border px-3 text-sm text-muted hover:text-red-500"
            >
              ✕
            </button>
          </div>
          );
        })}
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
