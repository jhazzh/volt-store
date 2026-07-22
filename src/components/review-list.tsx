"use client";

import { useState } from "react";
import { Stars } from "@/components/stars";
import { ReviewTags } from "@/components/review-tags";
import { aggregateTags } from "@/lib/review-tags-shared";
import type { Review } from "@/lib/types";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const chip: Record<Review["tags"][number]["sentiment"], string> = {
  positive: "bg-green-500/10 text-green-700 dark:text-green-400",
  neutral: "bg-muted/40 text-muted",
  negative: "bg-red-500/10 text-red-700 dark:text-red-400",
};

type Props = { reviews: Review[] };

/**
 * Review list with "what people say" aspect filters. Clicking a topic chip
 * narrows the list to reviews mentioning it; clicking it again clears.
 * All client-side over tags already on each review — no refetch.
 * @param {Props} props the product's reviews
 * @return {JSX.Element} filter row + list
 */
export function ReviewList({ reviews }: Props) {
  const [active, setActive] = useState<string | null>(null);
  const topics = aggregateTags(reviews);

  const shown = active
    ? reviews.filter((r) => r.tags.some((t) => t.topic === active))
    : reviews;

  return (
    <>
      {topics.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            What people say
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {topics.map((t) => {
              const on = active === t.topic;
              return (
                <li key={t.topic}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => setActive(on ? null : t.topic)}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition ${chip[t.sentiment]} ${on ? "ring-2 ring-offset-1 ring-current" : "hover:opacity-80"}`}
                  >
                    {t.topic} {t.count}
                  </button>
                </li>
              );
            })}
          </ul>
          {active && (
            <button
              type="button"
              onClick={() => setActive(null)}
              className="mt-2 text-xs text-muted underline"
            >
              Clear filter
            </button>
          )}
        </div>
      )}

      <ul className="mt-6 space-y-5">
        {shown.map((r) => (
          <li key={r.id} className="border-b border-border pb-5">
            <div className="flex items-center gap-2">
              <Stars rating={r.rating} />
              <span className="text-xs text-muted">
                {dateFmt.format(new Date(r.created_at))}
              </span>
            </div>
            {r.body && <p className="mt-2 leading-relaxed">{r.body}</p>}
            <ReviewTags tags={r.tags} />
          </li>
        ))}
      </ul>
    </>
  );
}
