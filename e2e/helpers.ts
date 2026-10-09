import { expect, type Page } from "@playwright/test";

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
