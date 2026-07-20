import { expect, test } from "@playwright/test";
import { assertSafeE2ETarget, env, testEmail } from "./security";

// Login attempts are limited by the application, rather than relying on an
// external provider's dashboard defaults. The DB function is atomic and the
// admin client is server-only, so the counter cannot be bypassed by clients.

const MAX_ATTEMPTS = 10;

async function cleanup() {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("SUPABASE_SECRET_KEY");
  await fetch(`${url}/rest/v1/rate_limits?key=like.login:*`, {
    method: "DELETE",
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
}

async function rateLimitRows() {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("SUPABASE_SECRET_KEY");
  const res = await fetch(`${url}/rest/v1/rate_limits?key=like.login:*&select=key,count`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  return res.json();
}

test("login brute force is rate limited by the application", async ({ page }) => {
  test.setTimeout(60_000);
  assertSafeE2ETarget();
  await cleanup();

  try {
    await page.goto("/login");
    const error = page.locator("p[role='alert']");
    for (let i = 1; i <= MAX_ATTEMPTS; i++) {
      await page.getByLabel("Email").fill(testEmail("brute-force-test"));
      await page.getByLabel("Password").fill(`wrong-password-${i}`);
      const submission = page.waitForResponse(
        (response) =>
          response.request().method() === "POST" && response.url().endsWith("/login"),
      );
      await page.getByRole("button", { name: "Log in" }).click();
      await submission;
      // A repeated invalid-credentials message does not change the DOM, so
      // wait for the server-side counter instead of racing the next submit.
      await expect
        .poll(async () => (await rateLimitRows())[0]?.count ?? 0)
        .toBe(i);
      await expect(error).not.toHaveText(/Too many login attempts/);
    }

    // Re-touch both fields so the form dispatches a fresh server-action
    // submission after the tenth attempt; filling only one field leaves the
    // click a no-op with useActionState.
    await page.getByLabel("Email").fill(testEmail("brute-force-test"));
    await page.getByLabel("Password").fill("wrong-password-blocked");
    const submission = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" && response.url().endsWith("/login"),
    );
    await page.getByRole("button", { name: "Log in" }).click();
    await submission;
    await expect
      .poll(async () => (await rateLimitRows())[0]?.count ?? 0)
      .toBe(MAX_ATTEMPTS + 1);
    await expect(error).toHaveText(/Too many login attempts/);
  } finally {
    await cleanup();
  }
});
