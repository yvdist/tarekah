import { expect, test } from "@playwright/test";

test("the follow-up demo marks the applications past the chosen wait", async ({
  page,
}) => {
  await page.goto("/");

  const demo = page.getByRole("group", { name: "Lama menunggu kabar" });

  await expect(demo.getByRole("button", { name: "7 hari" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    page.getByText("2 lamaran sudah waktunya disapa lagi."),
  ).toBeVisible();

  await demo.getByRole("button", { name: "14 hari" }).click();
  await expect(page.getByText("Belum ada yang perlu disapa.")).toBeVisible();

  await demo.getByRole("button", { name: "5 hari" }).click();
  await expect(
    page.getByText("3 lamaran sudah waktunya disapa lagi."),
  ).toBeVisible();
});

test("the board preview moves a card to Offer once it is on screen", async ({
  page,
}) => {
  await page.goto("/");

  const offer = page.locator('[data-status="offer"]');

  await offer.scrollIntoViewIfNeeded();
  await expect(offer).toContainText("Arunika Labs");
  await expect(page.getByText("Hasil tarékah-mu.")).toBeVisible();
});

test("the board preview stays still with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const interview = page.locator('[data-status="interview"]');

  await interview.scrollIntoViewIfNeeded();
  // Longer than the pause before the card would have moved.
  await page.waitForTimeout(2500);
  await expect(interview).toContainText("Arunika Labs");
});

test("the hero link scrolls to how it works", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Lihat cara kerjanya" }).click();

  await expect(
    page.getByRole("heading", { name: "Tahu kapan harus menyapa lagi" }),
  ).toBeInViewport();
});

test("the footer links to the author and the source", async ({ page }) => {
  await page.goto("/");

  const footer = page.getByRole("contentinfo");

  await expect(
    footer.getByRole("link", { name: "Yudistira Eka Pratama" }),
  ).toHaveAttribute("href", "https://github.com/yvdist");
  await expect(
    footer.getByRole("link", { name: "Kode di GitHub" }),
  ).toHaveAttribute("href", "https://github.com/yvdist/tarekah");
});
