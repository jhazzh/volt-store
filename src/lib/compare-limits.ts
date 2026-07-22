// Client-safe constants (no "server-only"), so UI components can import them
// without pulling in the LLM code. Kept separate from compare.ts on purpose.

// Keep the picker small: enough to compare, not enough to blow up the prompt.
export const COMPARE_MIN = 2;
export const COMPARE_MAX = 4;
