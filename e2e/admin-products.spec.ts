import fs from "node:fs";
import { expect, test } from "@playwright/test";

// Admin product management: a logged-in admin can create and delete a product;
// the write is gated by requireAdmin() + admin RLS.

const ADMIN_EMAIL = "admin-e2e@example.com";
const ADMIN_PASSWORD = "admin-e2e-passw0rd";
const SLUG = "e2e-digital-test";

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

/** Create a confirmed admin user via the Auth admin API; returns its id. */
async function createAdminUser(): Promise<string> {
  const res = await fetch(`${API()}/auth/v1/admin/users`, {
    method: "POST",
    headers: { ...adminHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
    }),
  });
  const user = await res.json();
  if (!user?.id) throw new Error(`Could not create admin user: ${JSON.stringify(user)}`);

  const [role] = await rest(`roles?name=eq.admin&select=id`);
  const roleRes = await fetch(`${API()}/rest/v1/user_roles`, {
    method: "POST",
    headers: {
      ...adminHeaders(),
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({ id: user.id, role_id: role.id }),
  });
  if (!roleRes.ok) throw new Error(`Assign role failed: ${await roleRes.text()}`);
  return user.id;
}

async function cleanup(userId?: string) {
  await fetch(`${API()}/rest/v1/products?slug=eq.${SLUG}`, {
    method: "DELETE",
    headers: adminHeaders(),
  });
  if (userId) {
    await fetch(`${API()}/auth/v1/admin/users/${userId}`, {
      method: "DELETE",
      headers: adminHeaders(),
    });
  }
}

test("admin can create and delete a digital product", async ({ page }) => {
  test.setTimeout(60_000);
  await cleanup();
  const userId = await createAdminUser();

  try {
    // Log in through the UI.
    await page.goto("/login");
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(checkout|)$/);

    // Create a digital product (url delivery — no file picker needed).
    await page.goto("/admin/products/new");
    await page.fill('input[name="name"]', "E2E Digital Test");
    await page.fill('input[name="slug"]', SLUG);
    await page.fill('input[name="price"]', "9.99");
    await page.selectOption('select[name="product_type"]', "digital");
    await page.selectOption('select[name="delivery_type"]', "url");
    await page.fill('input[name="delivery_value"]', "https://example.com/x.pdf");
    await page.click('button[type="submit"]');

    // Lands on the list with the new product visible.
    await page.waitForURL("**/admin/products");
    await expect(page.getByText("E2E Digital Test")).toBeVisible();

    // Delete it (confirm dialog auto-accepted).
    page.on("dialog", (d) => d.accept());
    await page
      .getByRole("row", { name: /E2E Digital Test/ })
      .getByRole("button", { name: /Delete/ })
      .click();
    await expect(page.getByText("E2E Digital Test")).toBeHidden();
  } finally {
    await cleanup(userId);
  }
});
