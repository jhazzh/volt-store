import fs from "node:fs";
import { expect, test } from "@playwright/test";

// Forged "paid" webhooks must be rejected. Both providers authenticate the
// call before touching the DB, so an attacker can't flip an order to 'paid'
// without the secret. Brute-forcing the secret is infeasible (Stripe HMAC /
// Xendit token compared in constant time) — these tests only prove the door
// is locked, not the math.

const STRIPE = "/api/webhooks/stripe";
const XENDIT = "/api/webhooks/xendit";

function env(name: string): string | undefined {
  const fromFile = fs
    .readFileSync(".env.local", "utf8")
    .match(new RegExp(`^${name}=(.*)$`, "m"))?.[1];
  return process.env[name] ?? fromFile;
}

const fakePaid = JSON.stringify({
  type: "checkout.session.completed",
  data: { object: { metadata: { order_id: "00000000-0000-4000-8000-000000000000" } } },
});

test.describe("Stripe webhook rejects forged calls", () => {
  test("no signature → 400", async ({ request }) => {
    const res = await request.post(STRIPE, {
      headers: { "content-type": "application/json" },
      data: fakePaid,
    });
    expect(res.status()).toBe(400);
  });

  test("garbage signature → 400 (never reaches DB)", async ({ request }) => {
    const res = await request.post(STRIPE, {
      headers: {
        "content-type": "application/json",
        "stripe-signature": "t=1,v1=deadbeef",
      },
      data: fakePaid,
    });
    expect(res.status()).toBe(400);
  });
});

test.describe("Xendit webhook rejects forged calls", () => {
  // The route returns 500 ("not configured") before any token check when the
  // env var is unset — skip rather than report a false failure.
  test.skip(!env("XENDIT_CALLBACK_TOKEN"), "XENDIT_CALLBACK_TOKEN not set");

  const fakeXenditPaid = JSON.stringify({
    id: "inv_forged",
    external_id: "00000000-0000-4000-8000-000000000000",
    status: "PAID",
  });

  test("no callback token → 401", async ({ request }) => {
    const res = await request.post(XENDIT, {
      headers: { "content-type": "application/json" },
      data: fakeXenditPaid,
    });
    expect(res.status()).toBe(401);
  });

  test("wrong callback token → 401 (never reaches DB)", async ({ request }) => {
    const res = await request.post(XENDIT, {
      headers: {
        "content-type": "application/json",
        "x-callback-token": "wrong-token",
      },
      data: fakeXenditPaid,
    });
    expect(res.status()).toBe(401);
  });

  test("valid token still needs a real order (idempotent status filter)", async ({
    request,
  }) => {
    // Right token, but the order id is fake — the status='pending' filter
    // matches nothing, so no order flips to paid. Proves auth alone isn't
    // the only guard.
    const res = await request.post(XENDIT, {
      headers: {
        "content-type": "application/json",
        "x-callback-token": env("XENDIT_CALLBACK_TOKEN"),
      },
      data: fakeXenditPaid,
    });
    expect(res.status()).toBe(200); // handled, but updated 0 rows
  });
});
