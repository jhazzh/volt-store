"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { reviewSchema } from "@/lib/validation";
import {
  needsSummary,
  summarizeReviews,
} from "@/lib/reviews-summary";
import type { Review } from "@/lib/types";

export type ReviewState = { error?: string; ok?: boolean };

/**
 * Submit (or update) a review for a product, then refresh the cached AI
 * summary if enough new reviews have come in since it was last built.
 *
 * Security: RLS enforces that only verified purchasers can insert, and only
 * for themselves (see 0017_reviews.sql). We use the cookie client for the
 * write so those policies apply; the summary write uses the admin client
 * because the products.review_summary column is admin-only.
 *
 * @param {string} slug product slug — for revalidation
 * @param {ReviewState} _prev previous form state (unused)
 * @param {FormData} formData rating + body
 * @return {Promise<ReviewState>} error or success
 */
export async function submitReview(
  slug: string,
  _prev: ReviewState,
  formData: FormData
): Promise<ReviewState> {
  const parsed = reviewSchema.safeParse({
    productId: formData.get("productId"),
    rating: formData.get("rating"),
    body: formData.get("body"),
  });
  if (!parsed.success) return { error: "Please pick a rating from 1 to 5." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in to leave a review." };

  const { productId, rating, body } = parsed.data;

  // Upsert so a shopper can revise their review; the unique (product_id,
  // user_id) constraint makes this idempotent.
  const { error } = await supabase.from("reviews").upsert(
    { product_id: productId, user_id: user.id, rating, body },
    { onConflict: "product_id,user_id" }
  );
  if (error) {
    // RLS rejects non-purchasers with a policy violation.
    return { error: "Only verified purchasers can review this product." };
  }

  await maybeRefreshSummary(productId);
  revalidatePath(`/products/${slug}`);
  return { ok: true };
}

/**
 * Regenerate the cached summary when it's stale. Runs with the admin client:
 * the summary lives on products, which only admins/service_role may write.
 * Best-effort — any failure leaves the previous summary in place.
 * @param {string} productId product id
 * @return {Promise<void>}
 */
async function maybeRefreshSummary(productId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: product } = await admin
    .from("products")
    .select("name, review_summary_count")
    .eq("id", productId)
    .maybeSingle<{ name: string; review_summary_count: number }>();
  if (!product) return;

  const { data: reviews } = await admin
    .from("reviews")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .returns<Review[]>();
  const all = reviews ?? [];

  if (!needsSummary(all.length, product.review_summary_count)) return;

  const summary = await summarizeReviews(product.name, all);
  if (!summary) return; // no key or transient failure — keep the old summary

  await admin
    .from("products")
    .update({ review_summary: summary, review_summary_count: all.length })
    .eq("id", productId);
}
