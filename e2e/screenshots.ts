import { execFileSync } from "node:child_process";
import { expect, test, type Page } from "@playwright/test";
import { authCookies, createSession, createUser } from "./db";
import { SCREENSHOT_USER } from "./constants";

// Regenerates the README screenshots from the seed data: `npm run screenshots`.
// Not part of the test run; see the `screenshots` project in the config.

const OUTPUT = "docs/screenshots";

test.beforeAll(async () => {
  await createUser(SCREENSHOT_USER.email, SCREENSHOT_USER.name);

  // The seed script reads its connection string from the environment and only
  // falls back to .env.local for variables that are not set.
  execFileSync("npx", ["tsx", "scripts/seed.ts", SCREENSHOT_USER.email], {
    env: {
      ...process.env,
      DATABASE_URL_UNPOOLED: process.env.E2E_DATABASE_URL,
    },
    stdio: "inherit",
  });
});

async function settle(page: Page) {
  await expect(page.locator('[data-slot="skeleton"]')).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  // Chart bars animate in.
  await page.waitForTimeout(800);
}

for (const colorScheme of ["light", "dark"] as const) {
  test(`capture pages in ${colorScheme}`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({
      colorScheme,
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 2,
      locale: "id-ID",
      timezoneId: "Asia/Jakarta",
    });

    await context.addCookies(
      authCookies(await createSession(SCREENSHOT_USER.email), baseURL!),
    );

    const page = await context.newPage();
    const capture = async (name: string, fullPage = false) => {
      await settle(page);
      await page.screenshot({
        path: `${OUTPUT}/${name}-${colorScheme}.png`,
        fullPage,
      });
    };

    await page.goto("/dashboard");
    await capture("dashboard", true);

    await page.goto("/board");
    await capture("board");

    // Dark mode is shown with two pages; the rest only in light.
    if (colorScheme === "light") {
      await page
        .getByRole("region", { name: "Interview" })
        .getByRole("link")
        .first()
        .click();
      await page.waitForURL(/\/applications\/[0-9a-f-]{36}$/);
      await capture("application");

      await page.goto("/applications");
      await capture("applications");

      await page.goto("/questions");
      await capture("questions");
    }

    await context.close();
  });
}
