import { expect, test } from "@playwright/test";

// Happy path: home → PLP → PDP → add to cart → drawer shows item.
test("browse and add to cart", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Shop all products" }).click();
  await expect(page).toHaveURL(/\/products/);

  await page.getByRole("link", { name: /Nimbus Headphones/ }).click();
  await expect(page.getByRole("heading", { name: "Nimbus Headphones" })).toBeVisible();

  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByRole("dialog", { name: "Shopping cart" })).toBeVisible();
  await expect(page.getByText("Nimbus Headphones")).toBeVisible();
});
