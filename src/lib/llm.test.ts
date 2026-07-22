import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { callLLM, llmEnabled } from "@/lib/llm";

const PAYLOAD = { messages: [{ role: "user", content: "hi" }] };
const ok = () => ({ ok: true, status: 200 }) as Response;
const rateLimited = () => ({ ok: false, status: 429 }) as Response;

describe("callLLM provider failover", () => {
  beforeEach(() => {
    vi.stubEnv("GROQ_API_KEY", "groq-key");
    vi.stubEnv("GEMINI_API_KEY", "gemini-key");
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("falls back to Gemini when Groq returns 429", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(rateLimited()); // Groq rate-limited
    fetchMock.mockResolvedValueOnce(ok()); // Gemini succeeds

    const res = await callLLM(PAYLOAD);

    expect(res?.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // First call hits Groq, second hits Gemini — with each provider's model.
    expect(fetchMock.mock.calls[0][0]).toContain("api.groq.com");
    expect(fetchMock.mock.calls[1][0]).toContain("generativelanguage.googleapis.com");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).model).toBe("gemini-2.0-flash");
  });

  it("uses Groq's response and skips Gemini when Groq is fine", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(ok());

    const res = await callLLM(PAYLOAD);

    expect(res?.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1); // no fallback
  });

  it("falls back to Gemini on a Groq network error", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockRejectedValueOnce(new Error("network")); // Groq throws
    fetchMock.mockResolvedValueOnce(ok()); // Gemini succeeds

    const res = await callLLM(PAYLOAD);

    expect(res?.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns null when every provider is rate-limited", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValue(rateLimited());

    expect(await callLLM(PAYLOAD)).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2); // tried both, then gave up
  });

  it("skips unconfigured providers", async () => {
    vi.stubEnv("GROQ_API_KEY", ""); // only Gemini configured
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(ok());

    await callLLM(PAYLOAD);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain("generativelanguage.googleapis.com");
  });
});

describe("llmEnabled", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("is false when no provider has a key", () => {
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", "");
    expect(llmEnabled()).toBe(false);
  });

  it("is true when at least one provider has a key", () => {
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", "k");
    expect(llmEnabled()).toBe(true);
  });
});
