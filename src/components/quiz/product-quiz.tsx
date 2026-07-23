"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatPrice } from "@/lib/format";
import { QUIZ_QUESTIONS } from "@/lib/quiz-questions";

type Card = {
  id: string;
  name: string;
  slug: string;
  price: number;
  image_url: string | null;
};

type Phase = "asking" | "loading" | "done";

/**
 * "Is this right for me?" quiz. Walks the shopper through a few fixed
 * questions, then streams an AI recommendation grounded in matched products.
 * @return {JSX.Element} the quiz widget
 */
export function ProductQuiz() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<{ id: string; choice: string }[]>([]);
  const [phase, setPhase] = useState<Phase>("asking");
  const [cards, setCards] = useState<Card[]>([]);
  const [pitch, setPitch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const question = QUIZ_QUESTIONS[step];
  const progress = Math.round((step / QUIZ_QUESTIONS.length) * 100);

  async function pick(choice: string) {
    const next = [...answers, { id: question.id, choice }];
    if (step < QUIZ_QUESTIONS.length - 1) {
      setAnswers(next);
      setStep(step + 1);
      return;
    }
    // Last answer — submit and stream the recommendation.
    setAnswers(next);
    setPhase("loading");
    setError(null);
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: next }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Something went wrong. Try again.");
        setPhase("asking");
        return;
      }

      // First line is the products JSON; the rest streams as the pitch text.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = ""; // holds the JSON header line until the newline arrives
      let text = ""; // full pitch so far — the single source of truth
      let headerDone = false;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });

        if (!headerDone) {
          buffer += chunk;
          const nl = buffer.indexOf("\n");
          if (nl === -1) continue; // header line not complete yet
          try {
            setCards(JSON.parse(buffer.slice(0, nl)).products ?? []);
          } catch {
            setError("Something went wrong. Try again.");
            setPhase("asking");
            return;
          }
          text = buffer.slice(nl + 1); // any pitch bytes after the newline
          headerDone = true;
          setPhase("done");
        } else {
          text += chunk;
        }
        setPitch(text);
      }
      setPhase("done");
    } catch {
      setError("Couldn't reach the assistant. Check your connection.");
      setPhase("asking");
    }
  }

  function restart() {
    setStep(0);
    setAnswers([]);
    setCards([]);
    setPitch("");
    setError(null);
    setPhase("asking");
  }

  return (
    <section className="mx-auto mt-14 max-w-2xl px-4">
      <h2 className="text-xl font-semibold">Find your match</h2>
      <p className="mt-1 text-sm text-muted">
        Answer three quick questions and AI will pick the right product for you.
      </p>

      {phase === "asking" && (
        <div className="mt-4 rounded-lg border border-border bg-card p-5">
          {/* Progress */}
          <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm font-medium">{question.prompt}</p>
          <div className="mt-3 grid gap-2">
            {question.options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => pick(opt)}
                className="rounded-lg border border-border px-4 py-2.5 text-left text-sm transition-colors hover:border-accent hover:text-foreground"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === "loading" && (
        <p
          aria-live="polite"
          className="mt-4 rounded-lg border border-border bg-card p-5 text-sm text-muted"
        >
          Finding your match…
        </p>
      )}

      {phase === "done" && (
        <div className="mt-4 space-y-4">
          {pitch && (
            <p
              aria-live="polite"
              className="rounded-lg border border-border bg-card p-4 text-sm leading-relaxed"
            >
              {pitch}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {cards.map((c) => (
              <Link
                key={c.id}
                href={`/products/${c.slug}`}
                className="rounded-lg border border-border p-3 text-sm transition-colors hover:border-accent"
              >
                {c.image_url && (
                  <div className="relative mb-2 aspect-square overflow-hidden rounded bg-border">
                    <Image
                      src={c.image_url}
                      alt={c.name}
                      fill
                      sizes="(min-width: 640px) 25vw, 50vw"
                      className="object-cover"
                    />
                  </div>
                )}
                <span className="line-clamp-2 font-medium">{c.name}</span>
                <span className="mt-1 block text-muted">
                  {formatPrice(c.price)}
                </span>
              </Link>
            ))}
          </div>
          <button
            type="button"
            onClick={restart}
            className="text-sm text-accent hover:underline"
          >
            Start over
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {error}
        </p>
      )}
    </section>
  );
}
