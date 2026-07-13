"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted">
        {error.digest ? `Error ref: ${error.digest}` : "Please try again."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}
