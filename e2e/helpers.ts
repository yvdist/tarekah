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

const SETTLE_LIMIT_MS = 2000;

// WCAG 2.1 A and AA rules; anything axe rates serious or critical fails.
export async function expectNoSeriousViolations(page: Page) {
  // Text that is still fading in (a toast, a dialog) has partial opacity, which
  // axe reads as low contrast. Wait, briefly, for what is moving to arrive.
  // Left alone: what loops forever (a skeleton), what is paused, and what
  // follows the scroll position instead of the clock.
  await page.evaluate(
    (limit) =>
      Promise.race([
        new Promise((resolve) => setTimeout(resolve, limit)),
        Promise.all(
          document
            .getAnimations()
            .filter(
              (animation) =>
                animation.playState === "running" &&
                animation.timeline instanceof DocumentTimeline &&
                animation.effect?.getComputedTiming().iterations !== Infinity,
            )
            .map((animation) => animation.finished.catch(() => undefined)),
        ),
      ]),
    SETTLE_LIMIT_MS,
  );

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

// Not a real key. The server runs with AI_FAKE_PROVIDER, so nothing is sent to
// a provider and every answer is the canned one in
// src/features/ai/fake-model.ts.
export const FAKE_API_KEY = "sk-ant-api03-e2e-not-a-real-key-Lt9w";
export const ANTHROPIC = "Anthropic (Claude)";

// Deletes every saved AI key. Specs that depend on which keys are saved start
// with this: one that failed halfway may have left a key behind.
export async function clearAiKeys(page: Page) {
  await page.goto("/settings");

  const panel = page.locator("section#ai");
  const rows = panel.getByRole("listitem");

  await expect(panel.getByLabel("API key")).toBeVisible();

  for (let left = await rows.count(); left > 0; left -= 1) {
    await rows
      .first()
      .getByRole("button", { name: /^Hapus key/ })
      .click();
    await page.getByRole("button", { name: "Hapus", exact: true }).click();
    await expect(rows).toHaveCount(left - 1);
  }
}

// Saves the fake key through the settings form, which makes it the active one.
export async function saveAiKey(page: Page) {
  await page.goto("/settings");

  const panel = page.locator("section#ai");

  await panel.getByLabel("API key").fill(FAKE_API_KEY);
  await panel.getByRole("button", { name: "Simpan key" }).click();
  await expect(
    panel
      .getByRole("listitem")
      .filter({ hasText: ANTHROPIC })
      .getByText("Aktif"),
  ).toBeVisible();
}
