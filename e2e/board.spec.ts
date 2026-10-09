import { expect, test, type Locator, type Page } from "@playwright/test";
import { addApplication, uniqueName } from "./helpers";

// dnd-kit only starts a drag after the pointer has travelled 8px, and picks
// the column from pointer positions along the way, so the mouse is moved in
// steps rather than jumped.
async function drag(page: Page, card: Locator, column: Locator) {
  const from = await card.boundingBox();
  const to = await column.boundingBox();

  if (!from || !to) {
    throw new Error("Card or column is not visible");
  }

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 20, from.y + 20, {
    steps: 5,
  });
  await page.mouse.move(to.x + to.width / 2, to.y + 60, { steps: 20 });
  await page.mouse.up();
}

test("moves a card to another column and records the change", async ({
  page,
}) => {
  const company = uniqueName("PT Papan");

  await addApplication(page, { company, position: "Backend Engineer" });
  await page.goto("/board");

  const wishlist = page.getByRole("region", { name: "Wishlist" });
  const applied = page.getByRole("region", { name: "Dilamar" });
  const card = page.getByRole("link", { name: new RegExp(company) });

  await expect(wishlist.getByText(company)).toBeVisible();

  // The card moves optimistically, before the Server Action has answered.
  // Reloading in between would abort the request, so wait for its response.
  const saved = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === "/board",
  );

  await drag(page, card, applied);

  await expect(applied.getByText(company)).toBeVisible();
  await expect(wishlist.getByText(company)).toHaveCount(0);
  expect((await saved).ok()).toBe(true);

  // Still there after a reload, so the move reached the database.
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Dilamar" }).getByText(company),
  ).toBeVisible();

  // The detail page shows both the first status and the move in its history.
  await page.getByRole("link", { name: new RegExp(company) }).click();
  await expect(page).toHaveURL(/\/applications\/[0-9a-f-]{36}$/);

  const history = page
    .getByRole("heading", { name: "Riwayat status" })
    .locator("..");

  const events = history.getByRole("listitem");

  await expect(events).toHaveCount(2);
  await expect(events.filter({ hasText: "Dibuat sebagai" })).toContainText(
    "Wishlist",
  );
  await expect(events.filter({ hasText: "Dilamar" })).toContainText("Wishlist");
});

test("moves a card with the keyboard", async ({ page }) => {
  const company = uniqueName("PT Kibor");

  await addApplication(page, { company, position: "QA Engineer" });
  await page.goto("/board");

  const card = page.getByRole("link", { name: new RegExp(company) });

  await card.focus();
  await page.keyboard.press("Space");
  await expect(page.locator('[id^="DndLiveRegion"]')).toContainText(
    "berada di atas kolom Wishlist",
  );

  // Each arrow press moves the card 25px; a column is 256px wide plus the gap.
  for (let step = 0; step < 11; step++) {
    await page.keyboard.press("ArrowRight");
  }

  await page.keyboard.press("Space");

  await expect(
    page.getByRole("region", { name: "Dilamar" }).getByText(company),
  ).toBeVisible();
});

test.describe("on a wide screen", () => {
  // Wide enough for every column, so the drag needs no scrolling.
  test.use({ viewport: { width: 2400, height: 900 } });

  test("marks an offer and a rejection with a quiet message", async ({
    page,
  }) => {
    const company = uniqueName("PT Hasil");

    await addApplication(page, { company, position: "Product Engineer" });
    await page.goto("/board");

    const card = page.getByRole("link", { name: new RegExp(company) });
    const offer = page.getByRole("region", { name: "Offer" });
    const rejected = page.getByRole("region", { name: "Ditolak" });

    await drag(page, card, offer);
    await expect(offer.getByText(company)).toBeVisible();
    await expect(page.getByText("Hasil tarékah-mu.")).toBeVisible();

    // dnd-kit ignores a new drag while the dropped card is still animating
    // into place. Until then the card is on the page twice.
    await expect(page.locator("p", { hasText: company })).toHaveCount(1);

    await drag(page, card, rejected);
    await expect(rejected.getByText(company)).toBeVisible();
    await expect(
      page.getByText("Dicatat. Satu léngkah tetap léngkah."),
    ).toBeVisible();
  });
});
