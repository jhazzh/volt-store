import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  // Purchase walk needs a live `stripe listen`; run it explicitly, not in CI.
  testIgnore: process.env.INCLUDE_WALK ? [] : ["**/purchase-walk.spec.ts"],
  use: {
    baseURL: "http://localhost:3000",
    // Traces can contain authenticated URLs and request data. Keep no browser
    // artifacts by default; enable them temporarily while debugging locally.
    trace: "off",
    video: "off",
    screenshot: "off",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
  },
});
