import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  // Purchase walk needs a live `stripe listen`; run it explicitly, not in CI.
  testIgnore: process.env.INCLUDE_WALK ? [] : ["**/purchase-walk.spec.ts"],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on", // scrub steps/DOM/network: npx playwright show-trace
    video: "on",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
  },
});
