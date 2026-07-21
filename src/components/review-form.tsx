"use client";

import { useActionState } from "react";
import {
  submitReview,
  type ReviewState,
} from "@/app/products/[slug]/reviews-actions";

type Props = { productId: string; slug: string };

/**
 * Verified-purchase review form. The server action enforces the purchase
 * check via RLS; a non-purchaser just sees an error.
 * @param {Props} props product id + slug
 * @return {JSX.Element} review form
 */
export function ReviewForm({ productId, slug }: Props) {
  const action = submitReview.bind(null, slug);
  const [state, formAction, pending] = useActionState<ReviewState, FormData>(
    action,
    {}
  );

  return (
    <form action={formAction} className="mt-4 space-y-3">
      <input type="hidden" name="productId" value={productId} />
      <div>
        <label htmlFor="rating" className="mb-1 block text-sm text-muted">
          Rating
        </label>
        <select
          id="rating"
          name="rating"
          defaultValue="5"
          required
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} star{n > 1 ? "s" : ""}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="body" className="mb-1 block text-sm text-muted">
          Your review <span className="text-muted">(optional)</span>
        </label>
        <textarea
          id="body"
          name="body"
          rows={3}
          maxLength={2000}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          placeholder="What did you think?"
        />
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-red-500">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p role="status" className="text-sm text-accent">
          Thanks — your review was posted.
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Posting…" : "Post review"}
      </button>
    </form>
  );
}
