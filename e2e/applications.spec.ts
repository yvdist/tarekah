import { expect, test } from "@playwright/test";
import { addApplication, uniqueName } from "./helpers";

test("shows validation errors for the required fields", async ({ page }) => {
  await page.goto("/applications/new");
  await page.getByRole("button", { name: "Simpan" }).click();

  await expect(page.getByText("Nama perusahaan wajib diisi")).toBeVisible();
  await expect(page.getByText("Posisi wajib diisi")).toBeVisible();
  await expect(page.getByLabel("Perusahaan")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page).toHaveURL(/\/applications\/new$/);
});

test("adds an application and lists it", async ({ page }) => {
  const company = uniqueName("PT Uji");
  const position = "Frontend Engineer";

  await page.goto("/applications/new");
  await page.getByLabel("Perusahaan").fill(company);
  await page.getByLabel("Posisi").fill(position);
  await page.getByLabel("Lokasi").fill("Jakarta");
  await page.getByLabel("Gaji minimum (IDR)").fill("8000000");
  await page.getByLabel("Gaji maksimum (IDR)").fill("12000000");
  await page.getByLabel("Catatan").fill("Dibuat oleh test E2E");
  await page.getByRole("button", { name: "Simpan" }).click();

  // The detail page of the new application.
  await expect(page).toHaveURL(/\/applications\/[0-9a-f-]{36}$/);
  await expect(
    page.getByRole("heading", { level: 1, name: position }),
  ).toBeVisible();
  await expect(page.getByText("IDR 8.000.000 – 12.000.000")).toBeVisible();
  await expect(page.getByText("Dibuat oleh test E2E")).toBeVisible();

  await page.goto("/applications");
  await page.getByLabel("Cari perusahaan atau posisi").fill(company);

  const row = page.getByRole("row", { name: new RegExp(company) });

  await expect(row).toHaveCount(1);
  await expect(row).toContainText(position);
  await expect(row).toContainText("Wishlist");
});

test("exports the applications as CSV", async ({ page }) => {
  const company = uniqueName("PT Ekspor, Tbk");

  await addApplication(page, { company, position: "=cmd|calc" });
  await page.goto("/applications");

  const downloadPromise = page.waitForEvent("download");

  await page.getByRole("link", { name: "Export CSV" }).click();

  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }

  const csv = Buffer.concat(chunks).toString("utf8");

  expect(download.suggestedFilename()).toMatch(
    /^tarekah-lamaran-\d{4}-\d{2}-\d{2}\.csv$/,
  );
  expect(csv.startsWith("\uFEFFPerusahaan,Posisi,Status")).toBe(true);
  // The comma in the name is quoted and the formula-like position is defused.
  expect(csv).toContain(`"${company}",'=cmd|calc,Wishlist`);
});
