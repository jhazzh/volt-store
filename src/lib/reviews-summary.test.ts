import { describe, expect, it } from "vitest";
import { needsSummary } from "./reviews-summary";

// Cache gate: rebuild only at >= 3 reviews AND >= 5 new since the last summary.
describe("needsSummary", () => {
  it("skips below the minimum review count", () => {
    expect(needsSummary(2, 0)).toBe(false);
  });

  it("builds the first summary once enough reviews exist", () => {
    expect(needsSummary(5, 0)).toBe(true);
  });

  it("waits until 5 new reviews since the last summary", () => {
    expect(needsSummary(8, 5)).toBe(false); // only 3 new
    expect(needsSummary(10, 5)).toBe(true); // 5 new
  });

  it("does not rebuild when nothing changed", () => {
    expect(needsSummary(7, 7)).toBe(false);
  });
});
