import { test, expect, type Page } from "@playwright/test";

// Dev builds are unoptimized — measure prod by default.
// Override: PERF_URL=http://localhost:3000 npm run test:perf
const BASE = process.env.PERF_URL ?? "https://volt-store-theta.vercel.app";

const PAGES = [
  { name: "home", path: "/" },
  { name: "product list", path: "/products" },
  { name: "product detail", path: "/products/nimbus-headphones" },
];

// Google "good" thresholds
const LCP_MAX = 2500;
const CLS_MAX = 0.1;
const TTFB_MAX = 800;

async function collectVitals(page: Page) {
  return page.evaluate(
    () =>
      new Promise<{ lcp: number; cls: number; ttfb: number }>((resolve) => {
        let lcp = 0;
        let cls = 0;
        new PerformanceObserver((list) => {
          const last = list.getEntries().at(-1);
          if (last) lcp = last.startTime;
        }).observe({ type: "largest-contentful-paint", buffered: true });
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as PerformanceEntry[] & { hadRecentInput?: boolean; value?: number }[]) {
            if (!entry.hadRecentInput) cls += entry.value ?? 0;
          }
        }).observe({ type: "layout-shift", buffered: true });
        const nav = performance.getEntriesByType(
          "navigation",
        )[0] as PerformanceNavigationTiming;
        // Let late shifts / LCP candidates settle
        setTimeout(() => resolve({ lcp, cls, ttfb: nav.responseStart }), 3000);
      }),
  );
}

for (const { name, path } of PAGES) {
  test(`CWV: ${name}`, async ({ page }) => {
    // 4x CPU slowdown ≈ mid-range phone; without it desktop passes trivially
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

    await page.goto(BASE + path, { waitUntil: "load" });
    const { lcp, cls, ttfb } = await collectVitals(page);

    console.log(
      `${name}: LCP ${Math.round(lcp)}ms | CLS ${cls.toFixed(3)} | TTFB ${Math.round(ttfb)}ms`,
    );
    expect(lcp, "LCP").toBeLessThan(LCP_MAX);
    expect(cls, "CLS").toBeLessThan(CLS_MAX);
    expect(ttfb, "TTFB").toBeLessThan(TTFB_MAX);
  });
}
