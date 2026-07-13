import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-5xl font-bold text-accent">404</h1>
      <p className="mt-3 text-muted">This page doesn&apos;t exist.</p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90"
      >
        Back home
      </Link>
    </div>
  );
}
