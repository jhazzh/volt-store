export default function AccountLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div className="h-9 w-40 animate-pulse rounded-md bg-card" />
      <div className="mt-2 h-4 w-56 animate-pulse rounded bg-card" />

      <section className="mt-10">
        <div className="h-6 w-24 animate-pulse rounded bg-card" />
        <ul className="mt-3 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="h-10 animate-pulse rounded-md border border-border bg-card" />
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <div className="h-6 w-44 animate-pulse rounded bg-card" />
        <div className="mt-3 max-w-sm space-y-3">
          <div className="h-10 animate-pulse rounded-md bg-card" />
          <div className="h-10 animate-pulse rounded-md bg-card" />
          <div className="h-10 w-32 animate-pulse rounded-lg bg-card" />
        </div>
      </section>
    </div>
  );
}
