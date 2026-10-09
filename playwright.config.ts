import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";
import { E2E_AUTH_SECRET } from "./e2e/constants";

// The E2E run creates and deletes users, so it must never share a database
// with real data. The connection string therefore has its own variable, set in
// .env.e2e locally (ignored by git) or in the environment on CI, and the app's
// own DATABASE_URL is never read here.
if (existsSync(".env.e2e")) {
  process.loadEnvFile(".env.e2e");
}

const databaseUrl = process.env.E2E_DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "E2E_DATABASE_URL is not set. Put the connection string of a throwaway Postgres database in .env.e2e (see README). Do not point it at the database in .env.local.",
  );
}

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;
const takeScreenshots = process.env.SCREENSHOTS === "1";

export const STORAGE_STATE = "e2e/.auth/user.json";

export default defineConfig({
  testDir: "./e2e",
  // One signed-in user is shared by the specs, so they run one at a time.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    locale: "id-ID",
    timezoneId: "Asia/Jakarta",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/, teardown: "teardown" },
    { name: "teardown", testMatch: /auth\.teardown\.ts/ },
    takeScreenshots
      ? {
          name: "screenshots",
          testMatch: /screenshots\.ts/,
          dependencies: ["setup"],
          use: {
            ...devices["Desktop Chrome"],
            viewport: { width: 1280, height: 800 },
            deviceScaleFactor: 2,
          },
        }
      : {
          name: "chromium",
          testMatch: /\.spec\.ts/,
          dependencies: ["setup"],
          use: { ...devices["Desktop Chrome"], storageState: STORAGE_STATE },
        },
  ],
  webServer: {
    // The production build: closer to what is deployed, and cached pages
    // behave as they do there.
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: baseURL,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    env: {
      DATABASE_URL: databaseUrl,
      AUTH_SECRET: E2E_AUTH_SECRET,
      AUTH_TRUST_HOST: "true",
      AUTH_GITHUB_ID: "e2e",
      AUTH_GITHUB_SECRET: "e2e",
      AUTH_GOOGLE_ID: "e2e",
      AUTH_GOOGLE_SECRET: "e2e",
    },
  },
});
