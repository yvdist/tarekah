import { expect, test } from "@playwright/test";

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the navigation opens in a sheet and closes after a link", async ({
    page,
  }) => {
    const navigation = page.getByRole("navigation", {
      name: "Navigasi utama",
    });

    await page.goto("/dashboard");
    await expect(navigation).toBeHidden();

    await page.getByRole("button", { name: "Buka navigasi" }).click();
    await expect(
      navigation.getByRole("link", { name: "Dashboard" }),
    ).toHaveAttribute("aria-current", "page");

    await navigation.getByRole("link", { name: "Board", exact: true }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Board" }),
    ).toBeVisible();
    await expect(navigation).toBeHidden();
  });
});
