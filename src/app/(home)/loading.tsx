export default function HomeLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4">
      <section className="py-16 text-center sm:py-24">
        <div className="mx-auto h-12 w-full max-w-2xl animate-pulse rounded-md bg-card" />
        <div className="mx-auto mt-4 h-5 w-full max-w-xl animate-pulse rounded bg-card" />
        <div className="mx-auto mt-8 h-11 w-44 animate-pulse rounded-lg bg-card" />
      </section>
      <section className="pb-16">
        <div className="mb-6 h-7 w-36 animate-pulse rounded-md bg-card" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-3">
              <div className="aspect-square animate-pulse rounded-lg bg-border" />
              <div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-border" />
              <div className="mt-2 h-4 w-1/3 animate-pulse rounded bg-border" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
