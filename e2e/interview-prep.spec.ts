import { expect, test } from "@playwright/test";
import { expectNoSeriousViolations, uniqueName } from "./helpers";

// One flow through the interview-prep foundation: a story, a manual question,
// the link between them, a readiness change made inline, and the filters.
test("writes a story, adds a question and links them", async ({ page }) => {
  const title = uniqueName("Migrasi monolith");
  const question = uniqueName("Ceritakan proyek tersulit");

  // A story, from the Cerita page.
  await page.goto("/stories/new");
  await page.getByLabel("Judul").fill(title);
  await page.getByLabel("Situasi").fill("Sistem lama lambat di jam sibuk.");
  await page.getByLabel("Aksi").fill("Memakai **strangler pattern**.");
  await page.getByRole("checkbox", { name: "Ownership" }).check();
  await page.getByRole("button", { name: "Simpan" }).click();

  await expect(page).toHaveURL(/\/stories\/[0-9a-f-]{36}$/);

  const header = page.locator("header").filter({ hasText: title });

  await expect(header.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(header.getByText("Ownership", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Sistem lama lambat di jam sibuk."),
  ).toBeVisible();
  await expect(
    page.getByText("Belum ada pertanyaan yang memakai cerita ini."),
  ).toBeVisible();
  await expectNoSeriousViolations(page);

  const storyUrl = page.url();

  // A manual question, from the Pertanyaan page.
  await page.goto("/questions");
  await page.getByRole("button", { name: "Tambah pertanyaan" }).click();
  await page.getByLabel("Pertanyaan", { exact: true }).fill(question);
  await page.getByRole("button", { name: "Simpan" }).click();

  const row = page.getByRole("listitem").filter({ hasText: question });

  await expect(row).toHaveCount(1);
  await expect(row.getByText("Ditulis sendiri")).toBeVisible();
  await expect(
    page.getByText(/\d+ siap · \d+ cukup · \d+ belum siap/),
  ).toBeVisible();

  // Link it to the story.
  await row.getByRole("button", { name: /^Cerita untuk pertanyaan/ }).click();
  await page.getByRole("checkbox", { name: title }).check();
  await page.getByRole("button", { name: "Simpan" }).click();

  await expect(row.getByRole("link", { name: title })).toBeVisible();
  await expect(
    row.getByRole("button", { name: /^Cerita untuk pertanyaan/ }),
  ).toHaveText("1 cerita");

  // Mark it ready, inline.
  const readiness = row.getByRole("combobox", { name: "Kesiapan" });

  await readiness.click();
  // The popup of the custom select, not the native filter <select> below.
  await page
    .getByRole("listbox")
    .getByRole("option", { name: "Siap", exact: true })
    .click();
  await expect(readiness).toContainText("Siap");

  // The filters live in the URL, so the choice survives a reload.
  await page.getByLabel("Filter kesiapan").selectOption("ready");
  await page.getByRole("button", { name: "Cari" }).click();

  await expect(page).toHaveURL(/readiness=ready/);
  await expect(page.getByRole("link", { name: "Reset" })).toBeVisible();
  await expect(
    page
      .getByRole("listitem")
      .filter({ hasText: question })
      .getByRole("combobox", { name: "Kesiapan" }),
  ).toContainText("Siap");
  await expectNoSeriousViolations(page);

  // The story page now lists the question.
  await page.goto(storyUrl);
  await expect(page.getByText(question)).toBeVisible();
  await expect(page.getByText("Lainnya · Siap")).toBeVisible();
});
