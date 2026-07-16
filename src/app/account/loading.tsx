/** Neutral: /account redirects to /login when signed out, so no page-shaped skeleton. */
export default function AccountLoading() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="flex justify-center gap-1.5 py-24"
    >
      <span className="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:-0.3s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:-0.15s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-muted" />
    </div>
  );
}
