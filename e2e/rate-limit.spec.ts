import fs from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { openFirstProduct } from "./helpers";

// Guest checkout rate limit, end to end: 10 orders go through (each redirects
// to Stripe — we abort that navigation, i.e. "cancel back"), the 11th is
// rejected by the server action. Test data is cleaned up via PostgREST.

const EMAIL = "rate-limit-test@example.com";
const MAX = 10;

function env(name: string): string {
  const fromFile = fs
    .readFileSync(".env.local", "utf8")
    .match(new RegExp(`^${name}=(.*)$`, "m"))?.[1];
  const value = process.env[name] ?? fromFile;
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

/** Deletes test orders and all guest-checkout rate-limit rows. */
async function cleanup() {
  console.log("[rate-limit] cleanup: deleting test orders + rate_limits rows");
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("SUPABASE_SECRET_KEY");
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  await fetch(`${url}/rest/v1/orders?email=eq.${EMAIL}`, { method: "DELETE", headers });
  await fetch(`${url}/rest/v1/rate_limits?key=like.guest-checkout:*`, {
    method: "DELETE",
    headers,
  });
}

async function payAttempt(page: Page) {
  console.log("[rate-limit]   → goto /checkout");
  await page.goto("/checkout");
  console.log("[rate-limit]   → fill email");
  await page.getByLabel("Email for receipt").fill(EMAIL);
  console.log("[rate-limit]   → click Pay with card");
  await page.getByRole("button", { name: "Pay with card" }).click();
  console.log("[rate-limit]   → clicked, waiting for provider redirect");
}

test("guest checkout blocks the 11th order per IP", async ({ page }) => {
  test.setTimeout(180_000); // 10 real Stripe sessions
  await cleanup(); // reruns start with a fresh window

  // "Cancel back from the provider": abort the redirect to Stripe — the
  // order and the rate-limit bump already happened server-side.
  await page.route(/^(?!.*localhost)/, (route, request) =>
    request.isNavigationRequest() ? route.abort() : route.continue(),
  );

  // Surface what the browser sees — page errors, failed requests, alerts.
  page.on("console", (msg) => {
    if (msg.type() === "error") console.log(`[browser error] ${msg.text()}`);
  });
  page.on("pageerror", (err) => console.log(`[page error] ${err.message}`));
  page.on("requestfailed", (r) =>
    console.log(`[request failed] ${r.url().slice(0, 80)} — ${r.failure()?.errorText}`),
  );

  // Guest (fresh context = logged out) with one product in the cart.
  console.log("[rate-limit] adding product to cart as guest");
  console.log("[rate-limit]   → goto /products");
  await page.goto("/products");
  console.log("[rate-limit]   → click product link");
  await openFirstProduct(page);
  console.log("[rate-limit]   → click Add to cart");
  await page.getByRole("button", { name: "Add to cart" }).click();
  console.log("[rate-limit]   → cart filled");

  for (let i = 1; i <= MAX; i++) {
    const toProvider = page.waitForRequest(
      (r) => r.isNavigationRequest() && !r.url().includes("localhost"),
    );
    await payAttempt(page);
    const redirect = await toProvider; // order created, redirect attempted → allowed
    console.log(`[rate-limit] attempt ${i}/${MAX}: allowed → ${redirect.url().slice(0, 60)}…`);
  }

  console.log(`[rate-limit] attempt ${MAX + 1}: expecting block`);
  await payAttempt(page);
  // getByRole("alert") also matches Next's invisible route announcer — target the text.
  await expect(page.getByText(/Too many orders/)).toBeVisible();
  console.log(`[rate-limit] attempt ${MAX + 1}: blocked ✔`);

  await cleanup();
});
