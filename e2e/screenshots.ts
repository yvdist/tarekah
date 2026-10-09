import { expect, test, type Page } from "@playwright/test";
import { authCookies, createSession } from "./db";
import { seedDemoUser } from "./helpers";
import { SCREENSHOT_USER } from "./constants";

// Regenerates the README screenshots from the seed data: `npm run screenshots`.
// Not part of the test run; see the `screenshots` project in the config.

const OUTPUT = "docs/screenshots";

// The archive pages and the settings, captured in both themes and at phone
// width.
const ARCHIVE_PAGES = ["contacts", "documents", "questions", "settings"];

test.beforeAll(seedDemoUser);

async function settle(page: Page) {
  await expect(page.locator('[data-slot="skeleton"]')).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  // Chart bars animate in.
  await page.waitForTimeout(800);
}

for (const colorScheme of ["light", "dark"] as const) {
  test(`capture pages in ${colorScheme}`, async ({ browser, baseURL }) => {
    // The light run visits every page at two widths.
    test.setTimeout(120_000);

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

    await page.goto("/applications");
    await capture("applications");

    for (const name of ARCHIVE_PAGES) {
      await page.goto(`/${name}`);
      await capture(name);
    }

    // Last, because the application below is opened from the board.
    await page.goto("/board");
    await capture("board");

    // The pages below follow the same patterns, so they are only shown in light.
    if (colorScheme === "light") {
      await page
        .getByRole("region", { name: "Interview" })
        .getByRole("link")
        .first()
        .click();
      await page.waitForURL(/\/applications\/[0-9a-f-]{36}$/);
      await capture("application");

      await page.goto("/companies");
      await capture("companies");

      await page.getByRole("row").nth(1).getByRole("link").first().click();
      await page.waitForURL(/\/companies\/[0-9a-f-]{36}$/);
      await capture("company");

      await page.goto("/applications/new");
      await capture("application-new");

      // Not found inside the shell; error.tsx renders the same card.
      await page.goto("/applications/tidak-ada");
      await capture("application-not-found");
    }

    await context.close();

    // The public pages, as a visitor who is not signed in sees them.
    const visitor = await browser.newContext({
      colorScheme,
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 2,
      locale: "id-ID",
      timezoneId: "Asia/Jakarta",
    });
    const publicPage = await visitor.newPage();

    for (const [path, name] of [
      ["/", "landing"],
      ["/login", "login"],
      ["/tidak-ada", "not-found"],
    ]) {
      await publicPage.goto(path);
      await settle(publicPage);
      await publicPage.screenshot({
        path: `${OUTPUT}/${name}-${colorScheme}.png`,
        fullPage: true,
      });
    }

    await visitor.close();

    // The redesigned pages at phone width, light only.
    if (colorScheme === "light") {
      const mobile = await browser.newContext({
        colorScheme,
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        locale: "id-ID",
        timezoneId: "Asia/Jakarta",
      });

      await mobile.addCookies(
        authCookies(await createSession(SCREENSHOT_USER.email), baseURL!),
      );

      const phone = await mobile.newPage();

      for (const name of [
        "dashboard",
        "board",
        "applications",
        ...ARCHIVE_PAGES,
      ]) {
        await phone.goto(`/${name}`);
        await settle(phone);
        await phone.screenshot({
          path: `${OUTPUT}/${name}-mobile-${colorScheme}.png`,
          fullPage: name === "dashboard",
        });
      }

      await mobile.close();

      const phoneVisitor = await browser.newContext({
        colorScheme,
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        locale: "id-ID",
        timezoneId: "Asia/Jakarta",
      });
      const publicPhone = await phoneVisitor.newPage();

      await publicPhone.goto("/");
      await settle(publicPhone);
      await publicPhone.screenshot({
        path: `${OUTPUT}/landing-mobile-${colorScheme}.png`,
        fullPage: true,
      });

      await phoneVisitor.close();
    }
  });
}
