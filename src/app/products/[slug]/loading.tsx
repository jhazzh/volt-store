export default function ProductLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid gap-8 md:grid-cols-2">
        {/* Image */}
        <div className="aspect-square animate-pulse rounded-xl bg-card" />

        {/* Details column — mirrors title, price, description, specs, button. */}
        <div className="flex flex-col">
          <div className="h-9 w-3/4 animate-pulse rounded-md bg-card" />
          <div className="mt-3 h-7 w-28 animate-pulse rounded-md bg-card" />

          <div className="mt-5 space-y-2">
            <div className="h-4 w-full animate-pulse rounded bg-border" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-border" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-border" />
          </div>

          <div className="mt-4 h-4 w-32 animate-pulse rounded bg-border" />

          {/* Spec rows */}
          <div className="mt-6 divide-y divide-border border-t border-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex justify-between gap-4 py-2">
                <div className="h-4 w-24 animate-pulse rounded bg-border" />
                <div className="h-4 w-16 animate-pulse rounded bg-border" />
              </div>
            ))}
          </div>

          <div className="mt-8 h-11 max-w-sm animate-pulse rounded-md bg-card" />
        </div>
      </div>
    </div>
  );
}
