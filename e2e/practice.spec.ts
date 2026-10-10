import { expect, type Page, test } from "@playwright/test";
import { expectNoSeriousViolations, uniqueName } from "./helpers";

// Not a real key. The server runs with AI_FAKE_PROVIDER, so nothing is sent
// to a provider and the feedback is the canned one in
// src/features/ai/fake-model.ts.
const API_KEY = "sk-ant-api03-e2e-not-a-real-key-Lt9w";
const ANTHROPIC = "Anthropic (Claude)";
const FOLLOW_UP = "Apa yang akan kamu lakukan berbeda kalau mengulanginya?";
const DRILL_URL = /\/practice\/drill\/[0-9a-f-]{36}$/;

async function addQuestion(page: Page, text: string) {
  await page.goto("/questions");
  await page.getByRole("button", { name: "Tambah pertanyaan" }).click();
  await page.getByLabel("Pertanyaan", { exact: true }).fill(text);
  await page.getByRole("button", { name: "Simpan" }).click();

  await expect(
    page.getByRole("listitem").filter({ hasText: text }),
  ).toHaveCount(1);
}

// Opens the drill of one question from the list on the Latihan page.
async function openDrill(page: Page, text: string) {
  await page.goto("/practice");
  await page
    .getByRole("listitem")
    .filter({ hasText: text })
    .getByRole("link", { name: /^Latih pertanyaan:/ })
    .click();

  await expect(page).toHaveURL(DRILL_URL);
  // Scoped to the panel: the list row is still there while the page changes.
  await expect(
    page
      .locator("section")
      .filter({
        has: page.getByRole("heading", { name: "Pertanyaan", exact: true }),
      })
      .getByText(text),
  ).toBeVisible();
}

// Without a key practice still works: the answer is saved and the place of the
// feedback holds an invitation, not an error.
test("saves an answer and invites to set a key when there is none", async ({
  page,
}) => {
  const question = uniqueName("Ceritakan konflik dengan rekan kerja");

  await addQuestion(page, question);

  await page.goto("/practice");
  await expect(
    page.getByRole("heading", { level: 1, name: "Latihan" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Navigasi utama" })
      .getByRole("link", { name: "Latihan" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("Belum ada key AI yang aktif.")).toBeVisible();
  await expectNoSeriousViolations(page);

  // The main button picks a question that is not ready yet.
  await page
    .getByRole("button", { name: "Mulai dari yang belum siap" })
    .click();
  await expect(page).toHaveURL(DRILL_URL);
  await expect(
    page.getByRole("heading", { level: 1, name: "Latihan singkat" }),
  ).toBeVisible();

  // The filter lives in the URL.
  await page.goto("/practice");
  await page.getByLabel("Filter kategori").selectOption("system_design");
  await page.getByRole("button", { name: "Terapkan" }).click();
  await expect(page).toHaveURL(/category=system_design/);
  await expect(
    page.getByRole("listitem").filter({ hasText: question }),
  ).toHaveCount(0);

  await openDrill(page, question);

  const answer = page.getByLabel("Jawaban", { exact: true });

  // An empty answer is a field error, not a failed request.
  await page.getByRole("button", { name: "Simpan jawaban" }).click();
  await expect(page.getByText("Tulis jawabanmu dulu")).toBeVisible();

  // The timer is off until asked for.
  await expect(page.getByRole("timer")).toHaveCount(0);
  await page.getByRole("button", { name: "Nyalakan timer" }).click();
  await expect(page.getByRole("timer")).toHaveText(/^00:0\d$/);

  await answer.fill("Saya mengajak rekan itu bicara empat mata lebih dulu.");
  await expectNoSeriousViolations(page);
  await page.getByRole("button", { name: "Simpan jawaban" }).click();

  await expect(page.getByText("Jawaban tersimpan.")).toBeVisible();
  await expect(
    page.getByText("Masukan atas jawabanmu muncul di sini"),
  ).toBeVisible();
  await expect(
    page.getByRole("main").getByRole("link", { name: "Pengaturan" }),
  ).toHaveAttribute("href", "/settings#ai");
  await expect(page.getByRole("button", { name: "Coba lagi" })).toHaveCount(0);
  await expectNoSeriousViolations(page);

  // The self-assessment can change right here.
  const readiness = page.getByRole("combobox", { name: "Kesiapan" });

  await readiness.click();
  await page
    .getByRole("listbox")
    .getByRole("option", { name: "Cukup", exact: true })
    .click();
  await expect(readiness).toContainText("Cukup");

  // Another try starts from what was written.
  await page.getByRole("button", { name: "Coba jawab lagi" }).click();
  await expect(answer).toHaveValue(
    "Saya mengajak rekan itu bicara empat mata lebih dulu.",
  );
});

// With a key: feedback in four parts and no score, the follow-up question
// saved to the bank once, and a story written from the drill.
test("gives feedback, saves the follow-up question and links a new story", async ({
  page,
}) => {
  const question = uniqueName("Ceritakan migrasi tersulitmu");
  const story = uniqueName("Migrasi tanpa downtime");

  await addQuestion(page, question);

  await page.goto("/settings");

  const panel = page.locator("section#ai");
  const credential = panel.getByRole("listitem").filter({ hasText: ANTHROPIC });

  await panel.getByLabel("API key").fill(API_KEY);
  await panel.getByRole("button", { name: "Simpan key" }).click();
  await expect(credential.getByText("Aktif")).toBeVisible();
  await credential
    .getByRole("button", { name: `Tes key ${ANTHROPIC}` })
    .click();
  await expect(credential.getByRole("status")).toHaveText("Key berfungsi.");

  await page.goto("/practice");
  await expect(page.getByText("Belum ada key AI yang aktif.")).toHaveCount(0);

  await openDrill(page, question);
  await expect(
    page.getByRole("combobox", { name: "Bahasa masukan" }),
  ).toContainText("Indonesia");

  const answer = page.getByLabel("Jawaban", { exact: true });
  const feedback = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Masukan", exact: true }),
  });
  const submit = page.getByRole("button", {
    name: "Simpan dan minta masukan",
  });

  await answer.fill("Saya memimpin migrasi basis data secara bertahap.");
  await submit.click();

  await expect(page.getByText("Jawaban tersimpan.")).toBeVisible();
  await expect(
    feedback.getByRole("heading", { name: "Yang sudah kuat" }),
  ).toBeVisible();
  await expect(
    feedback.getByText("Ada hasil yang bisa diukur di akhir cerita."),
  ).toBeVisible();
  await expect(
    feedback.getByRole("heading", { name: "Yang bisa dipertajam" }),
  ).toBeVisible();
  await expect(feedback.getByText("Struktur", { exact: true })).toBeVisible();
  await expect(
    feedback.getByText("Keringkasan", { exact: true }),
  ).toBeVisible();
  await expect(
    feedback.getByText("Waktu itu sistem kami lambat di jam sibuk."),
  ).toBeVisible();
  await expect(feedback.getByText(FOLLOW_UP)).toBeVisible();
  await expect(feedback.getByText(`Masukan dari ${ANTHROPIC}`)).toBeVisible();
  // Notes, never a score.
  await expect(feedback).not.toContainText(/\bskor\b|\d+\s*\/\s*\d+/i);
  expect(await page.content()).not.toContain(API_KEY);
  await expectNoSeriousViolations(page);

  await feedback.getByRole("button", { name: "Simpan ke bank" }).click();
  await expect(feedback.getByRole("status")).toHaveText(
    "Tersimpan di bank pertanyaan.",
  );

  // A second attempt gets the same follow-up question, which the bank now has.
  await page.getByRole("button", { name: "Coba jawab lagi" }).click();
  await submit.click();
  await feedback.getByRole("button", { name: "Simpan ke bank" }).click();
  await expect(feedback.getByRole("status")).toHaveText(
    "Pertanyaan itu sudah ada di bank pertanyaanmu.",
  );

  // A story written here is linked to the question being practised.
  await page.getByRole("button", { name: "Tulis cerita baru" }).click();

  const dialog = page.getByRole("dialog");

  await dialog.getByLabel("Judul").fill(story);
  await dialog.getByLabel("Aksi").fill("Memindahkan tabel satu per satu.");
  await expectNoSeriousViolations(page);
  await dialog.getByRole("button", { name: "Simpan" }).click();

  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("button", { name: "1 cerita tertaut" }),
  ).toBeVisible();

  // It is now the crib of the question, closed until opened.
  const crib = page.getByRole("region", { name: "Contekan cerita" });

  await expect(crib.getByText("Memindahkan tabel satu per satu.")).toBeHidden();
  await crib.getByText(story).click();
  await expect(
    crib.getByText("Memindahkan tabel satu per satu."),
  ).toBeVisible();
  await expectNoSeriousViolations(page);

  // The follow-up question is in the bank, marked as coming from practice.
  await page.goto("/questions");

  const saved = page.getByRole("listitem").filter({ hasText: FOLLOW_UP });

  await expect(saved).toHaveCount(1);
  await expect(saved.getByText("Dari latihan")).toBeVisible();

  // Leave nothing behind for the other specs: the canned question and the key.
  await saved.getByRole("button", { name: /^Hapus pertanyaan/ }).click();
  await page.getByRole("button", { name: "Hapus", exact: true }).click();
  await expect(saved).toHaveCount(0);

  await page.goto("/settings");
  await credential
    .getByRole("button", { name: `Hapus key ${ANTHROPIC}` })
    .click();
  await page.getByRole("button", { name: "Hapus", exact: true }).click();
  await expect(panel.getByRole("listitem")).toHaveCount(0);
});
