import { expect, test } from "@playwright/test";
import {
  addApplication,
  expectNoSeriousViolations,
  uniqueName,
} from "./helpers";

const PAGES = [
  { path: "/dashboard", heading: "Dashboard" },
  { path: "/applications", heading: "Lamaran" },
  { path: "/applications/new", heading: "Tambah lamaran" },
  { path: "/board", heading: "Board" },
  { path: "/companies", heading: "Perusahaan" },
  { path: "/settings", heading: "Pengaturan" },
];

// Open to visitors, so they are checked without a session.
const PUBLIC_PAGES = [
  { path: "/", heading: "Setiap lamaran" },
  { path: "/login", heading: "Masuk" },
];

const PUBLIC_VIEWPORTS = [
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
];

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`${colorScheme} theme`, () => {
    // The theme follows the OS setting until the user picks one.
    test.use({ colorScheme });

    test("public pages have no serious accessibility violations", async ({
      browser,
    }) => {
      for (const viewport of PUBLIC_VIEWPORTS) {
        const context = await browser.newContext({ colorScheme, viewport });
        const page = await context.newPage();

        for (const { path, heading } of PUBLIC_PAGES) {
          await page.goto(path);
          await expect(
            page.getByRole("heading", { level: 1, name: heading }),
          ).toBeVisible();
          await expectNoSeriousViolations(page);
        }

        await context.close();
      }
    });

    test("app pages have no serious accessibility violations", async ({
      page,
    }) => {
      // So the table, the board and the dashboard have something to render.
      await addApplication(page, {
        company: uniqueName("PT Akses"),
        position: "Accessibility Engineer",
      });

      for (const { path, heading } of PAGES) {
        await page.goto(path);
        await expect(
          page.getByRole("heading", { level: 1, name: heading }),
        ).toBeVisible();
        // Wait for the streamed sections to replace their placeholders.
        await expect(page.locator('[data-slot="skeleton"]')).toHaveCount(0);
        await expectNoSeriousViolations(page);
      }
    });
  });
}

test("skip link moves focus to the content", async ({ page }) => {
  await page.goto("/applications");
  await page.keyboard.press("Tab");

  const skipLink = page.getByRole("link", { name: "Lewati ke konten" });

  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main#konten")).toBeFocused();
});

test("theme toggle switches to dark and remembers it", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Ganti tema" }).click();
  await page.getByRole("menuitemradio", { name: "Gelap" }).click();

  await expect(page.locator("html")).toHaveClass(/dark/);

  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
});
