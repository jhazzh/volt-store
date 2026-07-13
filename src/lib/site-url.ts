/**
 * Site origin for metadata/sitemap. Tolerates scheme-less env values;
 * falls back to Vercel's auto URL, then localhost.
 * @return {string} absolute site origin
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.startsWith("http") ? explicit : `https://${explicit}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
