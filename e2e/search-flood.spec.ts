import { expect, test } from "@playwright/test";
import { assertSafeE2ETarget, env } from "./security";

// /api/search is unauthenticated, so it's throttled per IP (30/min). This
// floods it with 60 requests and asserts the limiter kicks in with a 429.

const FLOOD = 60;

/** Clears the search rate-limit rows so each run starts with a fresh window. */
async function cleanup() {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("SUPABASE_SECRET_KEY");
  await fetch(`${url}/rest/v1/rate_limits?key=like.search:*`, {
    method: "DELETE",
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
}

test("/api/search throttles a flood with 429", async ({ request }) => {
  test.setTimeout(60_000);
  assertSafeE2ETarget();
  await cleanup();
  const codes: number[] = [];
  for (let i = 0; i < FLOOD; i++) {
    const res = await request.get(`/api/search?q=head-${i}`);
    codes.push(res.status());
  }
  const ok = codes.filter((c) => c === 200).length;
  const throttled = codes.filter((c) => c === 429).length;
  console.log(`[search-flood] ${FLOOD} requests → ${ok}×200, ${throttled}×429`);

  // ~30 pass, the rest 429 — and once throttled it stays throttled
  // (no 200 after the first 429).
  expect(throttled, "flood should trip the limiter").toBeGreaterThan(0);
  const firstBlock = codes.indexOf(429);
  expect(codes.slice(firstBlock).every((c) => c === 429)).toBe(true);

  await cleanup();
});

test("/api/search returns results for a real query", async ({ request }) => {
  // Sanity: the endpoint works within budget, so the flood test means something.
  assertSafeE2ETarget();
  await cleanup();
  const res = await request.get("/api/search?q=he");
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(Array.isArray(body.results)).toBe(true);
});
