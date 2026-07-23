import { describe, expect, it } from "vitest";
import { parsePicks, type Candidate } from "./goes-well-with";

const candidates: Candidate[] = [
  { id: "aaa", name: "Phone Case" },
  { id: "bbb", name: "Charger" },
  { id: "ccc", name: "Screen Protector" },
  { id: "ddd", name: "Cable" },
];

// The model replies with 1-based indexes into the candidate list. This is the
// guard that keeps a bad reply from writing junk ids into goes_well_with.
describe("parsePicks", () => {
  it("maps 1-based numbers to ids, preserving order", () => {
    expect(parsePicks('{"picks":[2,1]}', candidates)).toEqual(["bbb", "aaa"]);
  });

  it("treats an empty list as a valid 'nothing fits' answer", () => {
    expect(parsePicks('{"picks":[]}', candidates)).toEqual([]);
  });

  it("drops out-of-range numbers instead of inventing products", () => {
    expect(parsePicks('{"picks":[9,1,0]}', candidates)).toEqual(["aaa"]);
  });

  it("dedupes repeated picks", () => {
    expect(parsePicks('{"picks":[1,1,2]}', candidates)).toEqual(["aaa", "bbb"]);
  });

  it("caps at PAIR_COUNT even when the model returns more", () => {
    expect(parsePicks('{"picks":[1,2,3,4]}', candidates)).toEqual([
      "aaa",
      "bbb",
      "ccc",
    ]);
  });

  it("returns [] on non-JSON, wrong shape, or missing key", () => {
    expect(parsePicks("not json", candidates)).toEqual([]);
    expect(parsePicks('{"picks":"1,2"}', candidates)).toEqual([]);
    expect(parsePicks('{"selection":[1]}', candidates)).toEqual([]);
  });

  it("ignores non-numeric entries", () => {
    expect(parsePicks('{"picks":["two",2]}', candidates)).toEqual(["bbb"]);
  });
});
