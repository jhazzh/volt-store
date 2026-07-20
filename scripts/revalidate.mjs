// Refresh the cached catalog pages after changing products in the DB.
// The homepage is ISR-cached (revalidate = 3600), so deletes and edits made
// outside the admin UI can take an hour to show otherwise.
//
//   npm run revalidate                            # local
//   npm run revalidate -- --prod                  # live site
//   npm run revalidate -- --prod drift-mouse-pro  # also that product page
const secret = process.env.REVALIDATE_SECRET;
if (!secret) {
  console.error("REVALIDATE_SECRET missing from the env file");
  process.exit(1);
}

const prod = process.argv.includes("--prod");
const base = prod ? "https://volt-store-theta.vercel.app" : "http://localhost:3000";
const slug = process.argv.slice(2).find((a) => !a.startsWith("--"));

const url = new URL("/api/revalidate", base);
if (slug) url.searchParams.set("slug", slug);

const res = await fetch(url, {
  method: "POST",
  headers: { "x-revalidate-secret": secret },
});

const body = await res.json();
if (!res.ok) {
  console.error(`Failed (${res.status}):`, body.error ?? body);
  process.exit(1);
}
console.log(`Revalidated on ${base}:`, body.revalidated.join(", "));
