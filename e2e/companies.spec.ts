import { expect, test } from "@playwright/test";
import {
  addApplication,
  expectNoSeriousViolations,
  uniqueName,
} from "./helpers";

// A company is created by the application that names it. Its page is where
// the website and the notes the interviewer reads are filled in.
test("fills in a company's website and notes", async ({ page }) => {
  const company = uniqueName("PT Catatan");
  const notes = "Tim kecil, produk B2B.\nInterview biasanya tiga tahap.";

  await addApplication(page, { company, position: "Backend Engineer" });
  await page.goto("/companies");
  await page.getByRole("link", { name: company }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: company }),
  ).toBeVisible();
  await expect(page.getByText("Belum ada catatan.")).toBeVisible();
  await expectNoSeriousViolations(page);

  await page.getByRole("button", { name: "Edit", exact: true }).click();

  const dialog = page.getByRole("dialog", { name: `Edit ${company}` });
  const website = dialog.getByLabel("Website");
  const save = dialog.getByRole("button", { name: "Simpan" });

  // The website is rendered as a link, so it has to be a full URL.
  await website.fill("contoh.co.id");
  await save.click();
  await expect(dialog.getByText("Isi dengan URL lengkap")).toBeVisible();
  await expectNoSeriousViolations(page);

  await website.fill("https://contoh.co.id/karier");
  await dialog.getByLabel("Catatan").fill(notes);
  await save.click();

  await expect(page.getByText("Perubahan disimpan")).toBeVisible();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("main").getByRole("link", { name: /contoh\.co\.id/ }),
  ).toHaveAttribute("href", "https://contoh.co.id/karier");
  await expect(page.getByText("Tim kecil, produk B2B.")).toBeVisible();
  await expect(page.getByText("Belum ada catatan.")).toHaveCount(0);
  await expectNoSeriousViolations(page);

  // What was saved is what the form starts from next time.
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(website).toHaveValue("https://contoh.co.id/karier");
  await expect(dialog.getByLabel("Catatan")).toHaveValue(notes);
});
