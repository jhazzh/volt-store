import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";

/**
 * Constant-time compare — a plain `!==` leaks the secret's length and
 * matching prefix through response timing.
 * @param {string | null} a candidate
 * @param {string} b expected secret
 * @return {boolean} true when equal
 */
function secretMatches(a: string | null, b: string): boolean {
  if (!a) return false;
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * On-demand ISR revalidation. Call after a product changes in the DB.
 * Secret goes in a header, not the query string — query strings land in
 * server access logs, shell history, and Referer headers.
 *
 *   curl -X POST "https://volt-store-theta.vercel.app/api/revalidate?slug=drift-mouse-pro" \
 *     -H "x-revalidate-secret: $REVALIDATE_SECRET"   # from .env.local
 *
 * Omit `slug` to refresh only the catalog pages.
 * @param {NextRequest} request incoming request
 * @return {Promise<Response>} JSON result
 */
export async function POST(request: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    return Response.json({ error: "REVALIDATE_SECRET not configured" }, { status: 500 });
  }
  if (!secretMatches(request.headers.get("x-revalidate-secret"), secret)) {
    return Response.json({ error: "Invalid secret" }, { status: 401 });
  }

  const slug = request.nextUrl.searchParams.get("slug");

  // Catalog pages list every product, so they go stale on any change.
  const revalidated = ["/", "/products"];
  revalidatePath("/");
  revalidatePath("/products");

  if (slug) {
    // Literal path — omit `type`, which is only for dynamic patterns.
    revalidatePath(`/products/${slug}`);
    revalidated.push(`/products/${slug}`);
  }

  return Response.json({ revalidated, now: Date.now() });
}
