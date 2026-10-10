import { expect, type Page, test } from "@playwright/test";
import { E2E_USER } from "./constants";
import { agePracticeSessions } from "./db";
import {
  addApplication,
  clearAiKeys,
  expectNoSeriousViolations,
  FAKE_API_KEY,
  saveAiKey,
  uniqueName,
} from "./helpers";

// The interviewer and the summary are the canned ones in
// src/features/ai/fake-model.ts: the server runs with AI_FAKE_PROVIDER.
const OPENING =
  "Terima kasih sudah meluangkan waktu. Boleh ceritakan sedikit tentang dirimu dan pekerjaanmu sekarang?";
const SECOND =
  "Menarik. Bagian mana dari pekerjaan itu yang paling kamu banggakan?";
const THIRD =
  "Baik. Ceritakan satu keputusan teknis yang sulit dan bagaimana kamu mengambilnya.";
const QUESTIONS = [
  "Boleh ceritakan sedikit tentang dirimu dan pekerjaanmu sekarang?",
  "Bagian mana dari pekerjaanmu yang paling kamu banggakan?",
];
const SESSION_URL = /\/practice\/simulation\/[0-9a-f-]{36}$/;

// Both tests depend on which keys are saved.
test.beforeEach(({ page }) => clearAiKeys(page));

const panel = (page: Page, title: string) =>
  page.locator("section").filter({
    has: page.getByRole("heading", { name: title, exact: true }),
  });

async function setStatus(page: Page, status: string) {
  await page.getByRole("combobox", { name: "Ubah status" }).click();
  await page
    .getByRole("listbox")
    .getByRole("option", { name: status, exact: true })
    .click();
  await expect(page.getByText(`Status diubah ke ${status}`)).toBeVisible();
}

// A simulation is a conversation with a model, so without a key its settings
// page holds an invitation, not a form and not an error.
test("invites to set a key before a simulation can start", async ({ page }) => {
  await page.goto("/practice");
  await page.getByRole("link", { name: "Atur simulasi" }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Simulasi interview" }),
  ).toBeVisible();
  await expect(
    page.getByText("Simulasi memakai key AI-mu sendiri"),
  ).toBeVisible();
  await expect(
    page.getByRole("main").getByRole("link", { name: "Pengaturan" }),
  ).toHaveAttribute("href", "/settings#ai");
  await expect(
    page.getByRole("button", { name: "Siapkan simulasi" }),
  ).toHaveCount(0);
  await expectNoSeriousViolations(page);
});

// From an application at the interview stage: settings filled in, a few turns,
// a request to repeat, the session ended early, the summary, and its
// questions saved to the bank once.
test("runs a simulation for an application and saves its questions", async ({
  page,
}) => {
  const company = uniqueName("Simulasi");
  const position = "Senior Backend Engineer";
  const story = uniqueName("Hasil yang paling dibanggakan");

  await saveAiKey(page);
  await addApplication(page, { company, position });

  // Offered only once an interview is on the way.
  const offer = page.getByRole("link", { name: "Latihan untuk interview ini" });

  await expect(
    page.getByRole("combobox", { name: "Ubah status" }),
  ).toBeVisible();
  await expect(offer).toHaveCount(0);
  await setStatus(page, "Interview");
  await offer.click();

  // The settings start from the application.
  await expect(page).toHaveURL(/\/practice\/simulation\/new\?application=/);
  await expect(page.getByRole("combobox", { name: "Lamaran" })).toContainText(
    `${company} · ${position}`,
  );
  await expect(page.getByRole("combobox", { name: "Level" })).toContainText(
    "Senior",
  );
  await expect(page.getByRole("combobox", { name: "Jenis" })).toContainText(
    "Behavioral",
  );
  await expect(
    page.getByRole("combobox", { name: "Nada interviewer" }),
  ).toContainText("Ramah");
  await expect(page.getByRole("combobox", { name: "Durasi" })).toContainText(
    "15 menit",
  );
  await expectNoSeriousViolations(page);

  await page.getByRole("button", { name: "Siapkan simulasi" }).click();
  await expect(page).toHaveURL(SESSION_URL);

  const sessionUrl = page.url();
  const conversation = page.getByRole("list", { name: "Percakapan" });
  const progress = panel(page, "Percakapan");

  // Nothing is asked of the provider until the user says so.
  await expect(
    page.getByText("Belum ada yang diucapkan di sesi ini."),
  ).toBeVisible();
  await expect(
    page
      .getByRole("main")
      .getByRole("link", { name: `${position} di ${company}` }),
  ).toBeVisible();
  await expectNoSeriousViolations(page);

  await page.getByRole("button", { name: "Mulai interview" }).click();
  await expect(conversation.getByText(OPENING)).toBeVisible();

  const answer = page.getByLabel("Jawabanmu", { exact: true });
  const send = page.getByRole("button", { name: "Kirim jawaban" });

  // After a reply the answer box is where the user is.
  await expect(answer).toBeFocused();

  // An empty answer is a field error, not a turn.
  await send.click();
  await expect(page.getByText("Tulis jawabanmu dulu")).toBeVisible();

  await answer.fill("Saya backend engineer, lima tahun di fintech.");
  await send.click();
  await expect(conversation.getByText(SECOND)).toBeVisible();
  await expect(
    conversation.getByText("Saya backend engineer, lima tahun di fintech."),
  ).toBeVisible();
  await expect(progress).toContainText("1 dari 6 jawaban");
  await expect(answer).toHaveValue("");
  await expectNoSeriousViolations(page);

  // Asking to hear the question again is a turn of its own and not an answer.
  await page
    .getByRole("button", { name: "Boleh diulang pertanyaannya?" })
    .click();
  await expect(conversation.getByText(THIRD)).toBeVisible();
  await expect(conversation.getByRole("listitem")).toHaveCount(5);
  await expect(progress).toContainText("1 dari 6 jawaban");

  // Everything said so far is saved: a reload shows the same session.
  await page.reload();
  await expect(conversation.getByText(OPENING)).toBeVisible();
  await expect(conversation.getByText(THIRD)).toBeVisible();
  await expect(conversation.getByRole("listitem")).toHaveCount(5);

  await answer.fill("Memecah monolit jadi layanan per domain.");
  await send.click();
  await expect(progress).toContainText("2 dari 6 jawaban");
  await expect(conversation.getByRole("listitem")).toHaveCount(7);

  // Ended early, with a confirmation.
  await page.getByRole("button", { name: "Akhiri sesi" }).click();

  const confirm = page.getByRole("alertdialog");

  await expect(confirm).toContainText(
    "Ringkasan disusun dari yang sudah kamu jawab.",
  );
  await expectNoSeriousViolations(page);
  await confirm.getByRole("button", { name: "Akhiri sesi" }).click();

  const summary = panel(page, "Ringkasan");

  await expect(
    summary.getByRole("heading", { name: "Yang sudah kuat" }),
  ).toBeVisible();
  await expect(
    summary.getByText("Kamu menjawab dengan runtut dan tidak terburu-buru."),
  ).toBeVisible();
  await expect(
    summary.getByRole("heading", { name: "Fokus berikutnya" }),
  ).toBeVisible();
  await expect(summary.getByText("Kekonkretan", { exact: true })).toBeVisible();
  await expect(
    summary.getByRole("heading", { name: "Per pertanyaan" }),
  ).toBeVisible();
  // Notes, never a score.
  await expect(summary).not.toContainText(/\bskor\b|\d+\s*\/\s*\d+/i);
  expect(await page.content()).not.toContain(FAKE_API_KEY);
  // The conversation stays readable, and nothing more can be said.
  await expect(conversation.getByText(OPENING)).toBeVisible();
  await expect(send).toHaveCount(0);
  await expectNoSeriousViolations(page);

  // Both questions are ticked; saving puts them in the bank once.
  const checklist = summary.getByRole("group", {
    name: "Simpan pertanyaan ke bank",
  });

  await expect(checklist.getByRole("checkbox")).toHaveCount(2);
  await expect(checklist.getByRole("checkbox", { checked: true })).toHaveCount(
    2,
  );
  await summary.getByRole("button", { name: "Simpan ke bank" }).click();
  await expect(page.getByText("2 pertanyaan disimpan ke bank")).toBeVisible();
  await expect(checklist.getByText("Sudah ada di bank")).toHaveCount(2);
  await expect(
    summary.getByRole("button", { name: "Simpan ke bank" }),
  ).toHaveCount(0);

  // A suggestion without a story opens the story form and links the result.
  await summary.getByRole("button", { name: "Tulis cerita baru" }).click();

  const dialog = page.getByRole("dialog");

  await dialog.getByLabel("Judul").fill(story);
  await expectNoSeriousViolations(page);
  await dialog.getByRole("button", { name: "Simpan" }).click();
  await expect(dialog).toBeHidden();
  await expect(summary.getByText(`Tertaut ke cerita ${story}`)).toBeVisible();

  // The session is in the history, and opens again to be read.
  await page.goto("/practice");

  const history = page.getByRole("list", { name: "Riwayat simulasi" });
  const row = history
    .getByRole("listitem")
    .filter({ hasText: `${position} di ${company}` });

  await expect(row).toContainText("Behavioral");
  await expect(row).toContainText("Selesai");
  await expectNoSeriousViolations(page);
  await row.getByRole("link", { name: /^Buka simulasi/ }).click();
  await expect(page).toHaveURL(sessionUrl);
  await expect(checklist.getByText("Sudah ada di bank")).toHaveCount(2);
  await expect(summary.getByText(`Tertaut ke cerita ${story}`)).toBeVisible();
  await expect(conversation.getByText(OPENING)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Mulai interview" }),
  ).toHaveCount(0);

  // The bank has them once, from practice and for this application.
  await page.goto("/questions");

  for (const question of QUESTIONS) {
    const saved = page.getByRole("listitem").filter({ hasText: question });

    await expect(saved).toHaveCount(1);
    await expect(saved.getByText("Dari latihan")).toBeVisible();
    await expect(saved).toContainText(company);
  }

  // A completed session is a step on the dashboard.
  await page.goto("/dashboard");
  await expect(
    page.locator("dl").filter({ hasText: "léngkah latihan" }),
  ).toContainText("simulasi");

  // Leave nothing behind for the other specs: the questions and the key.
  await page.goto("/questions");

  for (const question of QUESTIONS) {
    const saved = page.getByRole("listitem").filter({ hasText: question });

    await saved.getByRole("button", { name: /^Hapus pertanyaan/ }).click();
    await page.getByRole("button", { name: "Hapus", exact: true }).click();
    await expect(saved).toHaveCount(0);
  }

  await clearAiKeys(page);
});

// Nothing marks a session as abandoned: it is read that way once nothing has
// been said in it for hours. It takes no more turns, but what was answered
// can still be summarized.
test("closes a session that was left alone and still summarizes it", async ({
  page,
}) => {
  await saveAiKey(page);
  await page.goto("/practice/simulation/new");
  await page.getByRole("button", { name: "Siapkan simulasi" }).click();
  await expect(page).toHaveURL(SESSION_URL);

  const conversation = page.getByRole("list", { name: "Percakapan" });

  await page.getByRole("button", { name: "Mulai interview" }).click();
  await expect(conversation.getByText(OPENING)).toBeVisible();
  await page.getByLabel("Jawabanmu", { exact: true }).fill("Jawaban pertama.");
  await page.getByRole("button", { name: "Kirim jawaban" }).click();
  await expect(conversation.getByText(SECOND)).toBeVisible();

  await agePracticeSessions(E2E_USER.email, 7);
  await page.reload();

  await expect(page.getByRole("main")).toContainText("Tidak dilanjutkan");
  await expect(
    page.getByText("Sesi ini sudah lebih dari 6 jam tidak dilanjutkan"),
  ).toBeVisible();
  await expect(conversation.getByText(SECOND)).toBeVisible();
  await expect(page.getByRole("button", { name: "Kirim jawaban" })).toHaveCount(
    0,
  );
  await expectNoSeriousViolations(page);

  await page
    .getByRole("button", { name: "Akhiri dan lihat ringkasan" })
    .click();
  await expect(
    panel(page, "Ringkasan").getByRole("heading", { name: "Yang sudah kuat" }),
  ).toBeVisible();

  await clearAiKeys(page);
});
