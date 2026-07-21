import type { Product } from "@/lib/types";

/**
 * Shared sample Product for tests and stories. Pass overrides for the fields a
 * given test cares about (stock, image_url, digital delivery, ...).
 * @param {Partial<Product>} [overrides] Fields to replace on the base product
 * @return {Product} A complete Product
 */
export function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "p1",
    name: "Nimbus Headphones",
    slug: "nimbus-headphones",
    description: "Wireless over-ear headphones.",
    price: 199,
    stock: 5,
    product_type: "simple",
    delivery_type: null,
    delivery_value: null,
    image_url: "/nimbus.jpg",
    category_id: "c1",
    review_summary: null,
    review_summary_count: 0,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}
