import { describe, expect, it } from "vitest";
import { cartCount, cartReducer, cartTotal } from "./cart";
import type { CartItem } from "./types";

const item = (id: string, price = 10, qty = 1): CartItem => ({
  product: { id, name: `P${id}`, slug: `p-${id}`, price, image_url: null },
  qty,
});

describe("cartReducer", () => {
  it("adds a new item", () => {
    const next = cartReducer([], { type: "add", item: item("a") });
    expect(next).toHaveLength(1);
    expect(next[0].qty).toBe(1);
  });

  it("merges qty for an existing item", () => {
    const next = cartReducer([item("a", 10, 2)], { type: "add", item: item("a") });
    expect(next).toHaveLength(1);
    expect(next[0].qty).toBe(3);
  });

  it("caps qty at 99", () => {
    const next = cartReducer([item("a", 10, 98)], {
      type: "add",
      item: item("a", 10, 5),
    });
    expect(next[0].qty).toBe(99);
  });

  it("removes an item", () => {
    const next = cartReducer([item("a"), item("b")], { type: "remove", productId: "a" });
    expect(next.map((i) => i.product.id)).toEqual(["b"]);
  });

  it("setQty updates quantity", () => {
    const next = cartReducer([item("a")], { type: "setQty", productId: "a", qty: 5 });
    expect(next[0].qty).toBe(5);
  });

  it("setQty below 1 removes the item", () => {
    const next = cartReducer([item("a")], { type: "setQty", productId: "a", qty: 0 });
    expect(next).toHaveLength(0);
  });

  it("clears the cart", () => {
    const next = cartReducer([item("a"), item("b")], { type: "clear" });
    expect(next).toEqual([]);
  });
});

describe("totals", () => {
  it("computes total and count", () => {
    const items = [item("a", 10, 2), item("b", 5.5, 1)];
    expect(cartTotal(items)).toBe(25.5);
    expect(cartCount(items)).toBe(3);
  });
});
