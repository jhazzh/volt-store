import fs from "node:fs";
import { expect, test } from "@playwright/test";

// Supabase enforces auth rate limits server-side (Dashboard → Auth → Rate
// Limits). Hammer the password grant with wrong credentials until a 429 —
// proves login brute force gets throttled before our app is ever involved.
// Warning: also throttles real logins from this IP for a few minutes.

const ATTEMPTS = 60; // > any sane limit; default is well below this

function env(name: string): string {
  const fromFile = fs
    .readFileSync(".env.local", "utf8")
    .match(new RegExp(`^${name}=(.*)$`, "m"))?.[1];
  const value = process.env[name] ?? fromFile;
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

test("login brute force gets rate limited", async ({ request }) => {
  test.setTimeout(120_000);
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

  let limitedAt = 0;
  for (let i = 1; i <= ATTEMPTS; i++) {
    const res = await request.post(`${url}/auth/v1/token?grant_type=password`, {
      headers: { apikey: key, "Content-Type": "application/json" },
      data: { email: "brute-force-test@example.com", password: `wrong-${i}` },
    });
    if (res.status() === 429) {
      console.log(`[auth-rate-limit] 429 after ${i} attempts ✔`);
      limitedAt = i;
      break;
    }
    // 400 = credentials rejected but request allowed — keep hammering.
    expect(res.status(), `attempt ${i}`).toBe(400);
  }

  expect(limitedAt, `no 429 within ${ATTEMPTS} attempts — check rate limits`).toBeGreaterThan(0);
});
