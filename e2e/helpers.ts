import { execFileSync } from "node:child_process";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";
import { SCREENSHOT_USER } from "./constants";
import { createUser } from "./db";

// Creates an application through the form and lands on its detail page.
export async function addApplication(
  page: Page,
  application: { company: string; position: string },
) {
  await page.goto("/applications/new");
  await page.getByLabel("Perusahaan").fill(application.company);
  await page.getByLabel("Posisi").fill(application.position);
  await page.getByRole("button", { name: "Simpan" }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: application.position }),
  ).toBeVisible();
}

// Company names are unique per user, and the test user is shared by the run.
export const uniqueName = (prefix: string) =>
  `${prefix} ${Math.random().toString(36).slice(2, 8)}`;

// WCAG 2.1 A and AA rules; anything axe rates serious or critical fails.
export async function expectNoSeriousViolations(page: Page) {
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

// Creates the demo user and fills it from the seed script: every status, cards
// past their follow-up limit, enough rows for the charts. The teardown deletes
// the user again.
export async function seedDemoUser() {
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
}
