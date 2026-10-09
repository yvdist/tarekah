import { expect, test } from "@playwright/test";
import { authCookies, createSession } from "./db";
import { E2E_USER } from "./constants";

test.describe("signed out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("redirects a guest from the app to the login page", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Masuk" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Lanjut dengan GitHub" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Lanjut dengan Google" }),
    ).toBeVisible();
  });

  test("rejects a session cookie that matches no session", async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies(authCookies("not-a-real-session", baseURL!));
    await page.goto("/applications");

    await expect(page).toHaveURL(/\/login$/);
  });

  test("does not serve the CSV export to a guest", async ({ page }) => {
    await page.goto("/applications/export");

    await expect(page).toHaveURL(/\/login$/);
  });

  test("signs out and locks the app again", async ({
    page,
    context,
    baseURL,
  }) => {
    // Its own session, so signing out does not end the one the other specs use.
    await context.addCookies(
      authCookies(await createSession(E2E_USER.email), baseURL!),
    );

    await page.goto("/dashboard");
    await expect(page.getByText(E2E_USER.name)).toBeVisible();

    await page.getByRole("button", { name: "Keluar" }).click();
    await expect(page).toHaveURL(/localhost:\d+\/$/);

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
  });
});

test("opens the dashboard for a signed-in user", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText(E2E_USER.name)).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Navigasi utama" }).getByRole("link", {
      name: "Dashboard",
    }),
  ).toHaveAttribute("aria-current", "page");
});
