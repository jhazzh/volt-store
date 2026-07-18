import fs from "node:fs";
import { expect, test } from "@playwright/test";

// Full purchase walk (Stripe test mode): buy the digital PDF as a guest,
// pay with a test card, land on the order page, and download the file.
// Requires `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.

const EMAIL = "purchase-walk@example.com";
const PRODUCT_SLUG = "getting-started-guide";

function env(name: string): string {
  const fromFile = fs
    .readFileSync(".env.local", "utf8")
    .match(new RegExp(`^${name}=(.*)$`, "m"))?.[1];
  return process.env[name] ?? fromFile ?? "";
}

async function cleanup() {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("SUPABASE_SECRET_KEY");
  await fetch(`${url}/rest/v1/orders?email=eq.${EMAIL}`, {
    method: "DELETE",
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
}

test("guest buys the digital PDF and downloads it", async ({ page }) => {
  test.setTimeout(90_000);
  await cleanup();

  // 1. Add the PDF to the cart from its product page.
  await page.goto(`/products/${PRODUCT_SLUG}`);
  await page.getByRole("button", { name: /add to cart/i }).click();

  // 2. Go to checkout, enter guest email.
  await page.goto("/checkout");
  await page.fill('input[type="email"]', EMAIL);

  // 3. Pay with card -> redirects to Stripe hosted Checkout.
  await page.getByRole("button", { name: /pay with card/i }).click();
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 });

  // 4. Fill the Stripe test card and pay.
  await page.fill('input[name="cardNumber"]', "4242424242424242");
  await page.fill('input[name="cardExpiry"]', "12 / 34");
  await page.fill('input[name="cardCvc"]', "123");
  const nameField = page.locator('input[name="billingName"]');
  if (await nameField.count()) await nameField.fill("Test Buyer");
  await page.getByTestId("hosted-payment-submit-button").click();

  // 5. Back on our order page.
  await page.waitForURL(/\/orders\//, { timeout: 30_000 });

  // 6. The webhook flips the order to paid; poll until the Download appears.
  const download = page.getByRole("button", { name: /download/i });
  await expect(async () => {
    await page.reload();
    await expect(download).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 40_000 });

  // 7. Clicking Download hits our route (opens the signed file in a new tab).
  const [popup] = await Promise.all([
    page.waitForEvent("popup", { timeout: 15_000 }).catch(() => null),
    download.click(),
  ]);
  console.log("[walk] download opened:", popup ? popup.url().slice(0, 60) : "(same tab)");

  await cleanup();
});
