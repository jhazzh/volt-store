import { expect, test } from "@playwright/test";

// Semantic search runs against the live catalog + embeddings. These assert
// behaviour that keyword search alone cannot produce.
//
// Requires: migrations applied, `embed` function deployed, `npm run embed` run.

test("finds a product by meaning, not keyword", async ({ request }) => {
  // "running" appears nowhere in Stride Band's name or description — only an
  // embedding match can surface it.
  const res = await request.get("/api/search?q=something+for+running");
  expect(res.status()).toBe(200);

  const { results } = await res.json();
  const titles = results.map((r: { title: string }) => r.title);

  expect(titles.length, "semantic search returned nothing — is the catalog embedded?")
    .toBeGreaterThan(0);
  expect(titles[0]).toBe("Stride Band");
});

test("a specific query narrows instead of returning everything", async ({ request }) => {
  // The relative-margin cutoff should make an unambiguous query return few
  // results. Before that fix this returned the entire catalog.
  const res = await request.get("/api/search?q=charger");
  const { results } = await res.json();

  expect(results.length).toBeGreaterThan(0);
  expect(results.length).toBeLessThanOrEqual(3);
  expect(results[0].title).toContain("Charger");
});

test("pop-up and results page agree", async ({ request, page }) => {
  // Regression: /api/search had semantic merge but /products?q= did not, so
  // "See all results" showed fewer items than the pop-up.
  const q = "something for running";

  const res = await request.get(`/api/search?q=${encodeURIComponent(q)}`);
  const { results } = await res.json();
  const apiTitles = results.map((r: { title: string }) => r.title);

  await page.goto(`/products?q=${encodeURIComponent(q)}`);
  const pageTitles = await page.getByRole("heading", { level: 3 }).allInnerTexts();

  expect(pageTitles).toEqual(apiTitles);
});

test("category filter is not bypassed by semantic hits", async ({ page }) => {
  // Volt Charger is an accessory; searching it inside Audio must return
  // nothing, even though it is the top semantic match overall.
  await page.goto("/products?category=audio&q=charger");
  const titles = await page.getByRole("heading", { level: 3 }).allInnerTexts();
  expect(titles).not.toContain("Volt Charger 65W");
});

test("browsing without a query is unaffected", async ({ page }) => {
  // searchProducts() must fall through to plain getProducts when q is absent.
  await page.goto("/products?category=audio");
  const titles = await page.getByRole("heading", { level: 3 }).allInnerTexts();
  expect(titles.length).toBeGreaterThan(0);
  expect(titles).toContain("Nimbus Headphones");
});
