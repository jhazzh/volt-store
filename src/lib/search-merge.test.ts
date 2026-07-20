import { describe, expect, it } from "vitest";
import { mergeSearchResults } from "./merge";
import type { Product } from "./types";

const p = (id: string, price = 10): Product =>
  ({ id, name: `P${id}`, slug: `p-${id}`, price, image_url: null }) as Product;

const ids = (out: Product[]) => out.map((x) => x.id);

describe("mergeSearchResults", () => {
  it("appends semantic hits after keyword hits", () => {
    expect(ids(mergeSearchResults([p("a")], [p("b")], null))).toEqual(["a", "b"]);
  });

  it("does not duplicate a product found by both", () => {
    const out = mergeSearchResults([p("a")], [p("a"), p("b")], null);
    expect(ids(out)).toEqual(["a", "b"]);
  });

  it("degrades to keyword-only when semantic returns nothing", () => {
    // searchProductsSemantic returns [] when embedding fails or times out.
    expect(ids(mergeSearchResults([p("a")], [], null))).toEqual(["a"]);
  });

  it("returns semantic-only hits when keyword matches nothing", () => {
    // The whole point: "something for running" matches no product text.
    expect(ids(mergeSearchResults([], [p("b")], null))).toEqual(["b"]);
  });

  it("drops semantic hits outside the active category", () => {
    const allowed = new Set(["a", "b"]);
    const out = mergeSearchResults([p("a")], [p("b"), p("zzz")], allowed);
    expect(ids(out)).toEqual(["a", "b"]);
  });

  it("keeps keyword hits even if absent from the allow-list", () => {
    // Keyword results are already category-filtered upstream; the allow-list
    // exists only to constrain semantic hits.
    const out = mergeSearchResults([p("a")], [], new Set(["zzz"]));
    expect(ids(out)).toEqual(["a"]);
  });

  it("lets price-asc override relevance order", () => {
    const out = mergeSearchResults([p("a", 200)], [p("b", 50)], null, "price-asc");
    expect(out.map((x: Product) => x.price)).toEqual([50, 200]);
  });

  it("lets price-desc override relevance order", () => {
    const out = mergeSearchResults([p("a", 50)], [p("b", 200)], null, "price-desc");
    expect(out.map((x: Product) => x.price)).toEqual([200, 50]);
  });

  it("keeps relevance order for newest sort", () => {
    // 'newest' is the default; relevance beats it on a search.
    const out = mergeSearchResults([p("a", 200)], [p("b", 50)], null, "newest");
    expect(ids(out)).toEqual(["a", "b"]);
  });
});
