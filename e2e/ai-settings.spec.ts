import { expect, test } from "@playwright/test";
import { expectNoSeriousViolations } from "./helpers";

// Not a real key. The server runs with AI_FAKE_PROVIDER, so nothing is sent
// to a provider.
const API_KEY = "sk-ant-api03-e2e-not-a-real-key-Zq7x";
const ANTHROPIC = "Anthropic (Claude)";

// The user's own AI key, start to finish: saved, shown only by its last four
// characters, tested, given another model, and deleted.
test("saves an AI key, tests it, changes its model and deletes it", async ({
  page,
}) => {
  await page.goto("/settings");

  const panel = page.locator("section#ai");
  const keyField = panel.getByLabel("API key");
  const row = panel.getByRole("listitem").filter({ hasText: ANTHROPIC });

  await expect(panel.getByText("dikirim ke provider yang aktif")).toBeVisible();
  await expect(keyField).toHaveAttribute("type", "password");
  await expect(keyField).toHaveAttribute("autocomplete", "off");

  // An empty key is a field error, not a failed request.
  await panel.getByRole("button", { name: "Simpan key" }).click();
  await expect(panel.getByText("Isi key untuk provider ini")).toBeVisible();

  await keyField.fill(API_KEY);
  await panel.getByRole("button", { name: "Simpan key" }).click();

  await expect(row.getByText("Aktif")).toBeVisible();
  await expect(row.getByText("claude-sonnet-5-5")).toBeVisible();
  await expect(row).toContainText("Zq7x");

  // The key is gone from the field and from the page.
  await expect(keyField).toHaveValue("");
  expect(await page.content()).not.toContain(API_KEY);
  await expectNoSeriousViolations(page);

  await row.getByRole("button", { name: `Tes key ${ANTHROPIC}` }).click();
  await expect(row.getByRole("status")).toHaveText("Key berfungsi.");

  // Another model, without typing the key again.
  await panel.getByRole("combobox", { name: "Model" }).click();
  await page.getByRole("option", { name: "ID lain…" }).click();
  await panel.getByLabel("ID model").fill("claude-opus-5-5");
  await panel.getByRole("button", { name: "Simpan perubahan" }).click();

  await expect(row.getByText("claude-opus-5-5")).toBeVisible();
  await expect(row).toContainText("Zq7x");

  // It survives a reload, still without the key.
  await page.reload();
  await expect(row.getByText("claude-opus-5-5")).toBeVisible();
  expect(await page.content()).not.toContain(API_KEY);

  await row.getByRole("button", { name: `Hapus key ${ANTHROPIC}` }).click();
  await page.getByRole("button", { name: "Hapus", exact: true }).click();

  await expect(panel.getByRole("listitem")).toHaveCount(0);
  await expect(panel.getByRole("button", { name: "Simpan key" })).toBeVisible();
});

// A provider added after the first three: its key is stored under an enum
// value that a later migration introduced.
test("saves and tests a DeepSeek key with its default model", async ({
  page,
}) => {
  await page.goto("/settings");

  const panel = page.locator("section#ai");
  const row = panel.getByRole("listitem").filter({ hasText: "DeepSeek" });

  await panel.getByRole("combobox", { name: "Provider" }).click();
  await page.getByRole("option", { name: "DeepSeek" }).click();
  await panel.getByLabel("API key").fill("sk-e2e-not-a-real-deepseek-key-Dk4p");
  await panel.getByRole("button", { name: "Simpan key" }).click();

  await expect(row.getByText("Aktif")).toBeVisible();
  await expect(row.getByText("deepseek-flash")).toBeVisible();
  await expect(row).toContainText("Dk4p");

  await row.getByRole("button", { name: "Tes key DeepSeek" }).click();
  await expect(row.getByRole("status")).toHaveText("Key berfungsi.");

  await row.getByRole("button", { name: "Hapus key DeepSeek" }).click();
  await page.getByRole("button", { name: "Hapus", exact: true }).click();

  await expect(panel.getByRole("listitem")).toHaveCount(0);
});
