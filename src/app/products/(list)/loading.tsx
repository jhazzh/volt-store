export default function ProductsLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="h-8 w-40 animate-pulse rounded-md bg-card" />
        <div className="h-8 w-56 animate-pulse rounded-md bg-card" />
      </div>

      <div className="flex flex-col gap-8 md:flex-row">
        {/* Facet sidebar */}
        <div className="space-y-6 md:w-48 md:shrink-0">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 animate-pulse rounded bg-card" />
              <div className="h-4 w-20 animate-pulse rounded bg-border" />
              <div className="h-4 w-16 animate-pulse rounded bg-border" />
            </div>
          ))}
        </div>

        {/* Product grid — mirrors the real columns. */}
        <div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-3">
              <div className="aspect-square animate-pulse rounded-lg bg-border" />
              <div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-border" />
              <div className="mt-2 h-4 w-1/3 animate-pulse rounded bg-border" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
