"use client";

import { useState } from "react";

// A few starter prompts so shoppers see what they can ask.
const SUGGESTIONS = [
  "Is this good for beginners?",
  "What do reviewers complain about?",
  "How does it compare on battery life?",
];

/**
 * "Ask about this product" — streams a grounded AI answer from specs+reviews.
 * @param {{slug: string}} props product slug for the ask endpoint
 * @return {JSX.Element} question box + streamed answer
 */
export function ProductQA({ slug }: { slug: string }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function ask(q: string) {
    const trimmed = q.trim();
    if (trimmed.length < 3 || loading) return;
    setLoading(true);
    setError(null);
    setAnswer("");

    try {
      const res = await fetch(`/api/products/${slug}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Something went wrong. Try again.");
        return;
      }

      // Stream tokens as they arrive so the answer types out live.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        setAnswer((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } catch {
      setError("Couldn't reach the assistant. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto mt-14 max-w-6xl px-4">
      <h2 className="text-xl font-semibold">Ask about this product</h2>
      <p className="mt-1 text-sm text-muted">
        Answered by AI from the specs and customer reviews.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
        className="mt-4 flex gap-2"
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={300}
          placeholder="e.g. Is it good for travel?"
          aria-label="Ask a question about this product"
          className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={loading || question.trim().length < 3}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-border disabled:text-muted"
        >
          {loading ? "Thinking…" : "Ask"}
        </button>
      </form>

      {!answer && !loading && (
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setQuestion(s);
                ask(s);
              }}
              className="rounded-full border border-border px-3 py-1 text-xs text-muted transition-colors hover:border-accent hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {(answer || loading) && (
        <p
          aria-live="polite"
          className="mt-4 rounded-lg border border-border bg-card p-4 text-sm leading-relaxed"
        >
          {answer || "…"}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {error}
        </p>
      )}
    </section>
  );
}
