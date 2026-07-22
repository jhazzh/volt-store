import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { extractReviewTags } from "@/lib/review-tags";
import { aggregateTags } from "@/lib/review-tags-shared";
import type { Review } from "@/lib/types";

// Minimal review carrying only the tags aggregateTags reads.
const rev = (tags: Review["tags"]): Review => ({ tags }) as Review;

// Build a Groq-style chat response whose message content is `content`.
function groqReply(content: string) {
  return {
    ok: true,
    json: async () => ({ choices: [{ message: { content } }] }),
  } as Response;
}

describe("extractReviewTags", () => {
  beforeEach(() => {
    vi.stubEnv("GROQ_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns [] with no provider configured, skipping the call", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", ""); // both providers off
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    expect(await extractReviewTags("great battery")).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns [] for an empty body without calling out", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    expect(await extractReviewTags("   ")).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("parses valid tags", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      groqReply(
        JSON.stringify({
          tags: [{ topic: "Battery", sentiment: "negative" }],
        })
      )
    );
    expect(await extractReviewTags("battery dies fast")).toEqual([
      { topic: "battery", sentiment: "negative" }, // lowercased
    ]);
  });

  it("drops malformed tags, dedupes topics, and caps at 4", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      groqReply(
        JSON.stringify({
          tags: [
            { topic: "price", sentiment: "positive" },
            { topic: "price", sentiment: "negative" }, // dup topic -> dropped
            { topic: "screen", sentiment: "wat" }, // bad sentiment -> dropped
            { topic: "a", sentiment: "neutral" },
            { topic: "b", sentiment: "neutral" },
            { topic: "c", sentiment: "neutral" },
            { topic: "d", sentiment: "neutral" }, // over cap -> dropped
          ],
        })
      )
    );
    const tags = await extractReviewTags("x");
    expect(tags.map((t) => t.topic)).toEqual(["price", "a", "b", "c"]);
  });

  it("returns [] when the model returns non-JSON", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      groqReply("not json")
    );
    expect(await extractReviewTags("x")).toEqual([]);
  });

  it("returns [] on a network error, so the review still saves", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("network")
    );
    expect(await extractReviewTags("x")).toEqual([]);
  });
});

describe("aggregateTags", () => {
  it("counts topics and sorts by count", () => {
    const out = aggregateTags([
      rev([{ topic: "battery", sentiment: "negative" }]),
      rev([{ topic: "battery", sentiment: "negative" }]),
      rev([{ topic: "price", sentiment: "positive" }]),
    ]);
    expect(out).toEqual([
      { topic: "battery", sentiment: "negative", count: 2 },
      { topic: "price", sentiment: "positive", count: 1 },
    ]);
  });

  it("picks the dominant sentiment per topic", () => {
    const out = aggregateTags([
      rev([{ topic: "price", sentiment: "positive" }]),
      rev([{ topic: "price", sentiment: "positive" }]),
      rev([{ topic: "price", sentiment: "negative" }]),
    ]);
    expect(out).toEqual([{ topic: "price", sentiment: "positive", count: 3 }]);
  });

  it("handles reviews with no tags", () => {
    expect(aggregateTags([rev([]), rev([])])).toEqual([]);
  });
});
