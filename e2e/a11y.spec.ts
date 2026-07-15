import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Automated WCAG scan (axe). Catches ~30-40% of issues; the cart-drawer
// keyboard test below covers focus/trap behaviour axe can't detect.
const wcag = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function scan(page: Page) {
  return new AxeBuilder({ page }).withTags(wcag).analyze();
}

test("home page has no a11y violations", async ({ page }) => {
  await page.goto("/");
  const { violations } = await scan(page);
  expect(violations).toEqual([]);
});

test("products page has no a11y violations", async ({ page }) => {
  await page.goto("/products");
  const { violations } = await scan(page);
  expect(violations).toEqual([]);
});

test("open cart drawer has no a11y violations", async ({ page }) => {
  await page.goto("/products");
  await page.getByRole("link", { name: /Nimbus Headphones/ }).click();
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByRole("dialog", { name: "Shopping cart" })).toBeVisible();
  const { violations } = await scan(page);
  expect(violations).toEqual([]);
});

// Focus behaviour axe can't see: on-open focus, trap, Escape, restore.
test("cart drawer traps and restores keyboard focus", async ({ page }) => {
  await page.goto("/products");
  await page.getByRole("link", { name: /Nimbus Headphones/ }).click();
  await page.getByRole("button", { name: "Add to cart" }).click();

  const cart = page.getByRole("dialog", { name: "Shopping cart" });
  await expect(cart).toBeVisible();

  // Focus-on-open: close button gets focus.
  const closeBtn = cart.getByRole("button", { name: "Close cart" });
  await expect(closeBtn).toBeFocused();

  // Trap: Shift+Tab from the first control wraps to the last — focus stays inside.
  await page.keyboard.press("Shift+Tab");
  await expect(cart.locator(":focus")).toHaveCount(1);

  // Escape closes the drawer.
  await page.keyboard.press("Escape");
  await expect(cart).toBeHidden();

  // Restore: focus returns to the button that opened the drawer (Add to cart).
  await expect(page.getByRole("button", { name: "Add to cart" })).toBeFocused();
});
