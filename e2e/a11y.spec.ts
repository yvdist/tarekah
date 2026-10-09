import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { addApplication, uniqueName } from "./helpers";

// WCAG 2.1 A and AA rules; anything axe rates serious or critical fails.
async function expectNoSeriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const serious = violations
    .filter(
      (violation) =>
        violation.impact === "serious" || violation.impact === "critical",
    )
    .map((violation) => ({
      rule: violation.id,
      help: violation.help,
      targets: violation.nodes.map((node) => node.target.join(" ")),
    }));

  expect(serious).toEqual([]);
}

const PAGES = [
  { path: "/dashboard", heading: "Dashboard" },
  { path: "/applications", heading: "Lamaran" },
  { path: "/applications/new", heading: "Tambah lamaran" },
  { path: "/board", heading: "Board" },
  { path: "/settings", heading: "Pengaturan" },
];

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`${colorScheme} theme`, () => {
    // The theme follows the OS setting until the user picks one.
    test.use({ colorScheme });

    test("login page has no serious accessibility violations", async ({
      browser,
    }) => {
      const context = await browser.newContext({ colorScheme });
      const page = await context.newPage();

      await page.goto("/login");
      await expect(page.getByRole("heading", { name: "Masuk" })).toBeVisible();
      await expectNoSeriousViolations(page);
      await context.close();
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
