import { expect, test } from "@playwright/test";
import { SCREENSHOT_USER } from "./constants";
import { authCookies, createSession } from "./db";
import { expectNoSeriousViolations, seedDemoUser } from "./helpers";

// The shared test user has one wishlist application, so most of the palette
// never renders for it. The demo user has every status badge, follow-up
// warnings and full charts, which is where a colour can fail contrast.

const PAGES = [
  "/dashboard",
  "/board",
  "/applications",
  "/contacts",
  "/documents",
  "/questions",
  "/stories",
  "/settings",
];

const VIEWPORTS = [
  { name: "desktop", viewport: { width: 1280, height: 800 } },
  { name: "phone", viewport: { width: 390, height: 844 } },
];

test.beforeAll(seedDemoUser);

for (const colorScheme of ["light", "dark"] as const) {
  for (const { name, viewport } of VIEWPORTS) {
    test(`seeded pages have no serious accessibility violations (${colorScheme}, ${name})`, async ({
      browser,
      baseURL,
    }) => {
      const context = await browser.newContext({ colorScheme, viewport });

      await context.addCookies(
        authCookies(await createSession(SCREENSHOT_USER.email), baseURL!),
      );

      const page = await context.newPage();

      for (const path of PAGES) {
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await expect(page.locator('[data-slot="skeleton"]')).toHaveCount(0);
        await expectNoSeriousViolations(page);
      }

      await context.close();
    });
  }
}
