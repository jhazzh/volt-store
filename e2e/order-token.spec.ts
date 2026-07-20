import { expect, test, type Page } from "@playwright/test";
import { assertSafeE2ETarget, env, testEmail } from "./security";

// Guest order access control: the confirmation page must open only with the
// exact access token — no token, wrong token, or garbage all 404. Brute force
// is left to math (id + token are random UUIDs, ~2^122 each); this proves the
// door is actually locked.

const EMAIL = testEmail("order-token-test");

function adminHeaders() {
  const key = env("SUPABASE_SECRET_KEY");
  return { apikey: key, Authorization: `Bearer ${key}` };
}

/** Inserts a guest order via PostgREST; returns its id + access token. */
async function createGuestOrder(): Promise<{ id: string; access_token: string }> {
  const res = await fetch(`${env("NEXT_PUBLIC_SUPABASE_URL")}/rest/v1/orders`, {
    method: "POST",
    headers: {
      ...adminHeaders(),
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ email: EMAIL, total: 1, status: "pending" }),
  });
  const [order] = await res.json();
  if (!order?.id) throw new Error("Could not create test order");
  return order;
}

async function cleanup() {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  await fetch(`${url}/rest/v1/orders?email=eq.${EMAIL}`, {
    method: "DELETE",
    headers: adminHeaders(),
  });
  await fetch(`${url}/rest/v1/rate_limits?key=like.order-token:*`, {
    method: "DELETE",
    headers: adminHeaders(),
  });
}

/** Navigates the real browser there — visible with --headed / --debug. */
async function status(page: Page, path: string): Promise<number> {
  const res = await page.goto(path);
  return res?.status() ?? 0;
}

test("guest order page opens only with the exact token", async ({ page }) => {
  test.setTimeout(120_000); // ~35 page renders on the dev server
  assertSafeE2ETarget();
  await cleanup();
  const order = await createGuestOrder();
  console.log(`[order-token] test order ${order.id.slice(0, 8)}`);

  try {
    expect(await status(page,`/orders/${order.id}`), "no token").toBe(404);
    expect(await status(page,`/orders/${order.id}?token=`), "empty token").toBe(404);
    expect(
      await status(page,`/orders/${order.id}?token=not-a-uuid`),
      "garbage token",
    ).toBe(404);
    expect(
      await status(
        page,
        `/orders/${order.id}?token=00000000-0000-4000-8000-000000000000`,
      ),
      "wrong token",
    ).toBe(404);
    expect(
      await status(page,`/orders/${order.id}?token=${order.access_token}`),
      "correct token",
    ).toBe(200);
    console.log("[order-token] 4 wrong keys rejected, right key accepted ✔");

    // 30 wrong guesses/hour lock the IP — then even the right key 404s.
    for (let i = 0; i < 30; i++) {
      const code = await status(page,`/orders/${order.id}?token=wrong-${i}`);
      console.log(`[order-token] wrong guess ${i + 1}/30 → ${code}`);
    }
    expect(
      await status(page,`/orders/${order.id}?token=${order.access_token}`),
      "correct token after lockout",
    ).toBe(404);
    console.log("[order-token] locked out after 30 wrong guesses ✔");
  } finally {
    await cleanup();
  }
});
