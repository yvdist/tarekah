import { expect, test } from "@playwright/test";

test("shows the 404 page for an unknown address", async ({ page }) => {
  await page.goto("/tidak-ada");

  await expect(
    page.getByRole("heading", { name: "Halaman tidak ditemukan" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Ke beranda" })).toBeVisible();
});

test("shows not-found for an application that does not exist", async ({
  page,
}) => {
  await page.goto("/applications/3f2b8c1e-6a4d-4e9b-8f27-5d1c0a9b7e63");

  await expect(
    page.getByRole("heading", { name: "Lamaran tidak ditemukan" }),
  ).toBeVisible();
});

test("shows not-found for an application id that is not a uuid", async ({
  page,
}) => {
  await page.goto("/applications/1");

  await expect(
    page.getByRole("heading", { name: "Lamaran tidak ditemukan" }),
  ).toBeVisible();
});
