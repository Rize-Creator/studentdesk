import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  use: { baseURL: "http://localhost:3000" },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    // Never reuse a server that is already running. It may be set to send real email, and these tests assign tasks.
    reuseExistingServer: false,
    timeout: 120_000,
    // Test runs record emails instead of sending them.
    env: { EMAIL_MODE: "log" },
  },
});
