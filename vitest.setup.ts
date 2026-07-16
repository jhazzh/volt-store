import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import type { ReactNode } from "react";

// Next.js vendors React canary, which has ViewTransition; the standalone
// react package used in tests doesn't. Pass children through.
vi.mock("react", async (importOriginal) => {
  const mod = await importOriginal<typeof import("react")>();
  return {
    ...mod,
    ViewTransition:
      (mod as { ViewTransition?: unknown }).ViewTransition ??
      (({ children }: { children: ReactNode }) => children),
  };
});

// Unmount React trees between tests so the DOM doesn't leak across cases.
afterEach(cleanup);
