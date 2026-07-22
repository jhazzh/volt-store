import type { ReviewTag } from "@/lib/types";

const styles: Record<ReviewTag["sentiment"], string> = {
  positive: "bg-green-500/10 text-green-700 dark:text-green-400",
  neutral: "bg-muted/40 text-muted",
  negative: "bg-red-500/10 text-red-700 dark:text-red-400",
};

const icon: Record<ReviewTag["sentiment"], string> = {
  positive: "👍",
  neutral: "•",
  negative: "👎",
};

type Props = { tags: ReviewTag[] };

/**
 * Aspect sentiment chips for one review (e.g. "battery 👎").
 * @param {Props} props the review's tags
 * @return {JSX.Element | null} chip row, or null when there are no tags
 */
export function ReviewTags({ tags }: Props) {
  if (tags.length === 0) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5">
      {tags.map((t) => (
        <li
          key={t.topic}
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[t.sentiment]}`}
        >
          {t.topic} {icon[t.sentiment]}
        </li>
      ))}
    </ul>
  );
}
