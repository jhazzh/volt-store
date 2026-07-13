export default function ProductsLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 h-8 w-40 animate-pulse rounded-md bg-card" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-3">
            <div className="aspect-square animate-pulse rounded-lg bg-border" />
            <div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-border" />
            <div className="mt-2 h-4 w-1/3 animate-pulse rounded bg-border" />
          </div>
        ))}
      </div>
    </div>
  );
}
