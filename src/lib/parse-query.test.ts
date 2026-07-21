import { describe, expect, it } from "vitest";
import { hasFilterHint, normalize } from "./parse-query";

const cats = ["laptops", "gifts"];
const json = (o: unknown) => JSON.stringify(o);

describe("normalize", () => {
  it("keeps valid filters", () => {
    expect(normalize(json({ q: "quiet gift", maxPrice: 50 }), "raw", cats)).toEqual({
      q: "quiet gift",
      minPrice: undefined,
      maxPrice: 50,
      category: undefined,
      sort: undefined,
    });
  });

  it("falls back to raw text when q is missing or blank", () => {
    expect(normalize(json({ maxPrice: 50 }), "raw text", cats).q).toBe("raw text");
    expect(normalize(json({ q: "   " }), "raw text", cats).q).toBe("raw text");
  });

  it("drops a category not in the allowed list", () => {
    expect(normalize(json({ q: "x", category: "phones" }), "raw", cats).category)
      .toBeUndefined();
    expect(normalize(json({ q: "x", category: "gifts" }), "raw", cats).category)
      .toBe("gifts");
  });

  it("rejects negative, non-finite, and non-number prices", () => {
    expect(normalize(json({ q: "x", minPrice: -5 }), "raw", cats).minPrice)
      .toBeUndefined();
    expect(normalize(json({ q: "x", maxPrice: "50" }), "raw", cats).maxPrice)
      .toBeUndefined();
  });

  it("accepts only known sort values", () => {
    expect(normalize(json({ q: "x", sort: "price-asc" }), "raw", cats).sort)
      .toBe("price-asc");
    expect(normalize(json({ q: "x", sort: "rating" }), "raw", cats).sort)
      .toBeUndefined();
  });

  it("falls back to raw on malformed JSON or non-string input", () => {
    expect(normalize("not json", "raw", cats)).toEqual({ q: "raw" });
    expect(normalize(null, "raw", cats)).toEqual({ q: "raw" });
  });
});

describe("hasFilterHint", () => {
  it("fires on price/number/sort words", () => {
    for (const t of ["under $50", "over 100", "cheap laptop", "budget gift", "£20"]) {
      expect(hasFilterHint(t), t).toBe(true);
    }
  });

  it("skips plain keyword searches", () => {
    for (const t of ["blue running shoes", "wireless headphones", "gift for mom"]) {
      expect(hasFilterHint(t), t).toBe(false);
    }
  });
});
