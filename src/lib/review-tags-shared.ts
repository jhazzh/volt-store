import type { Review, ReviewTag } from "@/lib/types";

// Pure tag helpers, safe to import from client components. The LLM extractor
// (server-only) lives in review-tags.ts.

/** A tag with how many reviews mention it. */
export type AggregateTag = ReviewTag & { count: number };

/**
 * Roll a product's per-review tags into "what people say" counts. A topic keeps
 * whichever sentiment appears most for it (ties: first seen). Sorted by count.
 * @param {Review[]} reviews the product's reviews
 * @return {AggregateTag[]} topics with counts, most-mentioned first
 */
export function aggregateTags(reviews: Review[]): AggregateTag[] {
  // topic -> total count and a tally of each sentiment
  const byTopic = new Map<
    string,
    { count: number; sentiments: Map<ReviewTag["sentiment"], number> }
  >();
  for (const review of reviews) {
    for (const { topic, sentiment } of review.tags ?? []) {
      const entry =
        byTopic.get(topic) ?? { count: 0, sentiments: new Map() };
      entry.count += 1;
      entry.sentiments.set(sentiment, (entry.sentiments.get(sentiment) ?? 0) + 1);
      byTopic.set(topic, entry);
    }
  }

  return [...byTopic.entries()]
    .map(([topic, { count, sentiments }]) => {
      // Dominant sentiment for the chip's color.
      let sentiment: ReviewTag["sentiment"] = "neutral";
      let best = 0;
      for (const [s, n] of sentiments) {
        if (n > best) {
          best = n;
          sentiment = s;
        }
      }
      return { topic, sentiment, count };
    })
    .sort((a, b) => b.count - a.count);
}
