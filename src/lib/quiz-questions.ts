// Client-safe quiz data — no server-only imports, so the widget can use it.

// Fixed questions (Approach A): predictable, no dead ends, one LLM call total.
// `id` maps an answer back for building the search text; keep ids stable.
export type QuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
};

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "use",
    prompt: "What are you shopping for?",
    options: ["A gift", "An upgrade for myself", "A first-time purchase", "Just browsing"],
  },
  {
    id: "priority",
    prompt: "What matters most to you?",
    options: ["Best quality", "Best value for money", "Latest and greatest", "Simple and easy"],
  },
  {
    id: "budget",
    prompt: "What's your budget?",
    options: ["Under $50", "$50 - $150", "$150 - $500", "Money is no object"],
  },
];

/** A shopper's answer to one question: the question id and the chosen option. */
export type QuizAnswer = { id: string; choice: string };
