/**
 * Read-only star rating, rounded to the nearest whole star.
 * @param {{ rating: number; className?: string }} props rating 0-5
 * @return {JSX.Element} star row
 */
export function Stars({
  rating,
  className = "",
}: {
  rating: number;
  className?: string;
}) {
  const rounded = Math.round(rating);
  return (
    <span
      className={`text-accent ${className}`}
      role="img"
      aria-label={`${rating} out of 5 stars`}
    >
      {"★".repeat(rounded)}
      <span className="text-muted">{"★".repeat(5 - rounded)}</span>
    </span>
  );
}
