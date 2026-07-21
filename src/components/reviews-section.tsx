import { createClient } from "@/lib/supabase/server";
import { getReviews, getReviewStats } from "@/lib/data";
import { Stars } from "@/components/stars";
import { ReviewForm } from "@/components/review-form";
import type { Product } from "@/lib/types";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

type Props = { product: Product; slug: string };

/**
 * Reviews block for the product page: AI summary, rating stats, the list,
 * and (for signed-in users) the submit form.
 * @param {Props} props product + slug
 * @return {Promise<JSX.Element>} reviews section
 */
export async function ReviewsSection({ product, slug }: Props) {
  const [reviews, stats] = await Promise.all([
    getReviews(product.id),
    getReviewStats(product.id),
  ]);

  // Cheap auth read decides whether to render the form; the write is still
  // gated by RLS, so this is only a UX nicety.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <section className="mx-auto mt-14 max-w-6xl px-4">
      <h2 className="text-2xl font-bold">Reviews</h2>

      <div className="mt-2 flex items-center gap-3 text-sm text-muted">
        {stats.count > 0 ? (
          <>
            <Stars rating={stats.average ?? 0} />
            <span>
              {stats.average?.toFixed(1)} · {stats.count} review
              {stats.count === 1 ? "" : "s"}
            </span>
          </>
        ) : (
          <span>No reviews yet.</span>
        )}
      </div>

      {product.review_summary && (
        <div className="mt-4 rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Summary of reviews
          </p>
          <p className="mt-1 leading-relaxed">{product.review_summary}</p>
        </div>
      )}

      <ul className="mt-6 space-y-5">
        {reviews.map((r) => (
          <li key={r.id} className="border-b border-border pb-5">
            <div className="flex items-center gap-2">
              <Stars rating={r.rating} />
              <span className="text-xs text-muted">
                {dateFmt.format(new Date(r.created_at))}
              </span>
            </div>
            {r.body && <p className="mt-2 leading-relaxed">{r.body}</p>}
          </li>
        ))}
      </ul>

      {user ? (
        <div className="mt-8 max-w-lg">
          <h3 className="font-semibold">Write a review</h3>
          <p className="mt-1 text-sm text-muted">
            Only verified purchasers can post.
          </p>
          <ReviewForm productId={product.id} slug={slug} />
        </div>
      ) : (
        <p className="mt-8 text-sm text-muted">
          Sign in to review products you&rsquo;ve purchased.
        </p>
      )}
    </section>
  );
}
