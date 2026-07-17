import { expect, test } from "@playwright/test";
import { openFirstProduct } from "./helpers";

// Happy path: home → PLP → PDP → add to cart → drawer shows item.
test("browse and add to cart", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Shop all products" }).click();
  await expect(page).toHaveURL(/\/products/);

  const name = await openFirstProduct(page);
  await expect(page.getByRole("heading", { name })).toBeVisible();

  await page.getByRole("button", { name: "Add to cart" }).click();
  // Scope to the drawer: the name also appears in the PDP heading behind it.
  const cart = page.getByRole("dialog", { name: "Shopping cart" });
  await expect(cart).toBeVisible();
  await expect(cart.getByText(name)).toBeVisible();
});
