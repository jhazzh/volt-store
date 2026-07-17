import type { Page } from "@playwright/test";

/** From /products: opens the first in-stock product's PDP; returns its name. */
export async function openFirstProduct(page: Page): Promise<string> {
  const card = page
    .locator('a[href^="/products/"]')
    .filter({ hasNotText: "Out of stock" })
    .first();
  const name = await card.getByRole("heading").innerText();
  await card.click();
  return name;
}
