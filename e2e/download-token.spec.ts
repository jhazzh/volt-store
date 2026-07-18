import fs from "node:fs";
import { expect, test } from "@playwright/test";

// Digital delivery access control for /api/download/:orderItemId.
// A paid guest order's item is downloadable only with the exact order token;
// no/empty/wrong token all 404. Mirrors order-token.spec.ts.

const EMAIL = "download-token-test@example.com";
const PRODUCT_SLUG = "getting-started-guide"; // seeded by `npm run seed:digital`

function env(name: string): string {
  const fromFile = fs
    .readFileSync(".env.local", "utf8")
    .match(new RegExp(`^${name}=(.*)$`, "m"))?.[1];
  const value = process.env[name] ?? fromFile;
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

const API = () => env("NEXT_PUBLIC_SUPABASE_URL");
function adminHeaders() {
  const key = env("SUPABASE_SECRET_KEY");
  return { apikey: key, Authorization: `Bearer ${key}` };
}

async function rest(path: string, init: RequestInit = {}) {
  const res = await fetch(`${API()}/rest/v1/${path}`, {
    ...init,
    headers: {
      ...adminHeaders(),
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers ?? {}),
    },
  });
  return res.json();
}

/** Paid guest order with one digital order_item. Returns ids + token. */
async function createPaidDigitalOrder() {
  const [product] = await rest(`products?slug=eq.${PRODUCT_SLUG}&select=id`);
  if (!product?.id)
    throw new Error(`Seed the digital product first: npm run seed:digital`);

  const [order] = await rest("orders", {
    method: "POST",
    body: JSON.stringify({ email: EMAIL, total: 12, status: "paid" }),
  });
  if (!order?.id) throw new Error("Could not create test order");

  const [item] = await rest("order_items", {
    method: "POST",
    body: JSON.stringify({
      order_id: order.id,
      product_id: product.id,
      qty: 1,
      unit_price: 12,
    }),
  });
  if (!item?.id) throw new Error("Could not create test order_item");

  return { orderId: order.id, itemId: item.id, token: order.access_token };
}

async function cleanup() {
  await fetch(`${API()}/rest/v1/orders?email=eq.${EMAIL}`, {
    method: "DELETE",
    headers: adminHeaders(),
  });
  await fetch(`${API()}/rest/v1/rate_limits?key=like.download-token:*`, {
    method: "DELETE",
    headers: adminHeaders(),
  });
}

test("digital download opens only with the exact order token", async ({
  request,
  baseURL,
}) => {
  await cleanup();
  const { itemId, token } = await createPaidDigitalOrder();
  const url = (t?: string) =>
    `${baseURL}/api/download/${itemId}${t === undefined ? "" : `?token=${t}`}`;

  // Don't follow redirects: a valid delivery 302s to an off-origin signed URL.
  const hit = (t?: string) =>
    request.get(url(t), { maxRedirects: 0 });

  try {
    expect((await hit()).status(), "no token").toBe(404);
    expect((await hit("")).status(), "empty token").toBe(404);
    expect(
      (await hit("00000000-0000-4000-8000-000000000000")).status(),
      "wrong token"
    ).toBe(404);

    const ok = await hit(token);
    expect([301, 302, 303, 307, 308], "correct token redirects to file").toContain(
      ok.status()
    );
  } finally {
    await cleanup();
  }
});
