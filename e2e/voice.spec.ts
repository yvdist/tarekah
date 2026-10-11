import { expect, type Page, test } from "@playwright/test";
import {
  addQuestion,
  clearAiKeys,
  expectNoSeriousViolations,
  openDrill,
  saveAiKey,
  uniqueName,
} from "./helpers";

// No test here uses a microphone or a speech service: the browser's speech
// APIs are replaced before the page loads, and the test says what is "heard".
declare global {
  interface Window {
    __speech: { lang: string; say: (text: string, final: boolean) => void };
    __spoken: string[];
    __mic: { sawStreaming: boolean; offeredWhileStreaming: boolean };
  }
}

const SECOND_LINE =
  "Menarik. Bagian mana dari pekerjaan itu yang paling kamu banggakan?";
const SESSION_URL = /\/practice\/simulation\/[0-9a-f-]{36}$/;

// A browser that cannot listen, like Firefox.
function removeSpeechRecognition() {
  for (const name of ["SpeechRecognition", "webkitSpeechRecognition"]) {
    Object.defineProperty(window, name, {
      value: undefined,
      configurable: true,
    });
  }
}

// A recognizer that hears what `window.__speech.say` tells it. With `deny`
// it answers the way a browser does when the microphone is refused.
function fakeSpeechRecognition({ deny }: { deny: boolean }) {
  type Result = { 0: { transcript: string }; length: 1; isFinal: boolean };
  type Handler<T> = ((event: T) => void) | null;

  // The last one started is the one listening.
  const started: FakeRecognition[] = [];

  class FakeRecognition {
    lang = "";
    continuous = false;
    interimResults = false;
    onresult: Handler<{ results: Result[] }> = null;
    onerror: Handler<{ error: string }> = null;
    onend: Handler<void> = null;
    results: Result[] = [];

    start() {
      started.push(this);
      window.__speech.lang = this.lang;

      if (deny) {
        setTimeout(() => {
          this.onerror?.({ error: "not-allowed" });
          this.onend?.();
        });
      }
    }

    stop() {
      setTimeout(() => this.onend?.());
    }

    abort() {
      this.onend?.();
    }
  }

  window.__speech = {
    lang: "",
    // An interim result is replaced by the next thing said, as in a browser.
    say(text, final) {
      const current = started.at(-1);

      if (!current) {
        throw new Error("The microphone is off.");
      }

      if (current.results.at(-1)?.isFinal === false) {
        current.results.pop();
      }

      current.results.push({
        0: { transcript: text },
        length: 1,
        isFinal: final,
      });
      current.onresult?.({ results: current.results });
    },
  };

  for (const name of ["SpeechRecognition", "webkitSpeechRecognition"]) {
    Object.defineProperty(window, name, {
      value: FakeRecognition,
      configurable: true,
    });
  }
}

// One Indonesian voice, and a record of what it was asked to say.
function fakeSpeechSynthesis() {
  window.__spoken = [];

  class FakeUtterance {
    voice: unknown = null;
    lang = "";

    constructor(readonly text: string) {}
  }

  Object.defineProperty(window, "SpeechSynthesisUtterance", {
    value: FakeUtterance,
    configurable: true,
  });
  Object.defineProperty(window, "speechSynthesis", {
    value: {
      getVoices: () => [{ lang: "id-ID", localService: true }],
      speak: (utterance: FakeUtterance) => window.__spoken.push(utterance.text),
      cancel: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
    },
    configurable: true,
  });
}

const say = (page: Page, text: string, final: boolean) =>
  page.evaluate(([heard, settled]) => window.__speech.say(heard, settled), [
    text,
    final,
  ] as const);

// The drill tests run without a key: speaking an answer needs none.
test.beforeEach(({ page }) => clearAiKeys(page));

test("keeps typing where the browser cannot listen", async ({ page }) => {
  const question = uniqueName("Ceritakan proyek yang paling sulit");

  await page.addInitScript(removeSpeechRecognition);
  await addQuestion(page, question);
  await openDrill(page, question);

  await expect(
    page.getByText("Input suara belum didukung di browser ini."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Jawab dengan suara" }),
  ).toHaveCount(0);
  await expectNoSeriousViolations(page);

  await page
    .getByLabel("Jawaban", { exact: true })
    .fill("Saya memecahnya jadi bagian kecil lebih dulu.");
  await page.getByRole("button", { name: "Simpan jawaban" }).click();

  await expect(page.getByText("Jawaban tersimpan.")).toBeVisible();
  await expect(page.getByText(/^Jawabanmu (sekitar|kurang)/)).toHaveCount(0);
});

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`${colorScheme} theme`, () => {
    test.use({ colorScheme });

    // The whole path of a spoken answer: the note before the first use, words
    // arriving in the answer box, the transcript edited, the answer saved the
    // way a typed one is, and how long it ran.
    test("answers a drill by voice and edits the transcript", async ({
      page,
    }) => {
      const question = uniqueName("Tell me about a time you led a migration");

      await page.addInitScript(fakeSpeechRecognition, { deny: false });
      await page.clock.install();
      await addQuestion(page, question);
      await openDrill(page, question);

      const answer = page.getByLabel("Jawaban", { exact: true });
      const mic = page.getByRole("button", { name: "Jawab dengan suara" });
      const save = page.getByRole("button", { name: "Simpan jawaban" });
      const notice = page.getByRole("group", {
        name: "Sebelum mikrofon menyala",
      });

      // The language is offered without a key: the microphone listens in it.
      await expect(
        page.getByRole("combobox", { name: "Bahasa jawaban" }),
      ).toContainText("Inggris");

      // Before the microphone is used for the first time, where the audio goes.
      await answer.fill("So,");
      await mic.click();
      await expect(notice).toContainText("server Google");
      await expect(
        notice.getByRole("button", { name: "Nyalakan mikrofon" }),
      ).toBeFocused();
      await expectNoSeriousViolations(page);

      // Changing one's mind leaves the microphone off.
      await notice.getByRole("button", { name: "Batal" }).click();
      await expect(notice).toHaveCount(0);
      await expect(mic).toBeFocused();

      await mic.click();
      await notice.getByRole("button", { name: "Nyalakan mikrofon" }).click();

      const stop = page.getByRole("button", { name: "Berhenti" });

      await expect(stop).toBeFocused();
      await expect(stop).toHaveAttribute("aria-pressed", "true");
      await expect(
        page.getByRole("status").filter({ hasText: "Mendengarkan." }),
      ).toBeVisible();
      expect(await page.evaluate(() => window.__speech.lang)).toBe("en-US");

      // What is heard follows what was typed, and is not final yet.
      await say(page, "I let the", false);
      await expect(answer).toHaveValue("So, I let the");
      await say(page, "I led the migration", true);
      await say(page, " to a new", false);
      await expect(answer).toHaveValue("So, I led the migration to a new");

      // While listening the answer is neither typed into nor sent.
      await expect(answer).toHaveAttribute("readonly");
      await expect(save).toBeDisabled();
      await expectNoSeriousViolations(page);

      await say(page, " to a new queue", true);
      await page.clock.fastForward("02:00");
      await stop.click();

      await expect(
        page.getByRole("status").filter({ hasText: "Berhenti mendengarkan." }),
      ).toBeVisible();
      await expect(answer).toHaveValue(
        "So, I led the migration to a new queue",
      );
      await expect(answer).not.toHaveAttribute("readonly");

      // The transcript is the user's to correct before it is saved.
      await answer.fill("I led the migration to a new queue in two weeks.");
      await save.click();

      await expect(page.getByText("Jawaban tersimpan.")).toBeVisible();
      await expect(
        page.getByText("I led the migration to a new queue in two weeks."),
      ).toBeVisible();
      await expect(page.getByText("Jawabanmu sekitar 2 menit.")).toBeVisible();

      // The yardstick is there for whoever asks.
      await expect(page.getByText("Jawaban behavioral umumnya")).toBeHidden();
      await page.getByText("Biasanya berapa lama?").click();
      await expect(page.getByText("Jawaban behavioral umumnya")).toBeVisible();
      await expectNoSeriousViolations(page);

      // The note was read once: the next time the microphone just turns on.
      await page.getByRole("button", { name: "Coba jawab lagi" }).click();
      await mic.click();
      await expect(notice).toHaveCount(0);
      await expect(stop).toBeVisible();
    });
  });
}

test("explains a refused microphone and keeps typing", async ({ page }) => {
  const question = uniqueName("Ceritakan saat kamu salah memperkirakan");

  await page.addInitScript(fakeSpeechRecognition, { deny: true });
  await addQuestion(page, question);
  await openDrill(page, question);

  const answer = page.getByLabel("Jawaban", { exact: true });

  await page.getByRole("button", { name: "Jawab dengan suara" }).click();
  await page.getByRole("button", { name: "Nyalakan mikrofon" }).click();

  await expect(
    page.getByRole("status").filter({ hasText: "Izin mikrofon belum" }),
  ).toContainText("lanjutkan dengan mengetik.");
  await expect(
    page.getByRole("button", { name: "Jawab dengan suara" }),
  ).toHaveAttribute("aria-pressed", "false");
  await expectNoSeriousViolations(page);

  await answer.fill("Saya memberi tahu tim begitu tahu perkiraannya meleset.");
  await page.getByRole("button", { name: "Simpan jawaban" }).click();

  await expect(page.getByText("Jawaban tersimpan.")).toBeVisible();
  await expect(page.getByText(/^Jawabanmu (sekitar|kurang)/)).toHaveCount(0);
});

// In a simulation the microphone is gone while the interviewer answers, and
// the interviewer is only read aloud once the user asks for it.
test("speaks an answer in a simulation and has the reply read aloud", async ({
  page,
}) => {
  await page.addInitScript(fakeSpeechRecognition, { deny: false });
  await page.addInitScript(fakeSpeechSynthesis);
  await saveAiKey(page);

  await page.goto("/practice/simulation/new");
  await page.getByRole("button", { name: "Siapkan simulasi" }).click();
  await expect(page).toHaveURL(SESSION_URL);

  const conversation = page.getByRole("list", { name: "Percakapan" });
  const answer = page.getByLabel("Jawabanmu", { exact: true });
  const readAloud = page.getByRole("button", { name: "Bacakan pertanyaan" });

  // Off until asked for: the opening question is not read out.
  await expect(readAloud).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Mulai interview" }).click();
  await expect(answer).toBeFocused();
  expect(await page.evaluate(() => window.__spoken)).toEqual([]);

  await readAloud.click();
  await expect(
    page.getByRole("button", { name: "Matikan suara interviewer" }),
  ).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "Jawab dengan suara" }).click();
  await page.getByRole("button", { name: "Nyalakan mikrofon" }).click();
  expect(await page.evaluate(() => window.__speech.lang)).toBe("id-ID");
  await say(page, "Saya backend engineer di sebuah bank digital", true);
  await expect(
    page.getByRole("button", { name: "Kirim jawaban" }),
  ).toBeDisabled();
  await expectNoSeriousViolations(page);
  await page.getByRole("button", { name: "Berhenti" }).click();
  await expect(answer).toHaveValue(
    "Saya backend engineer di sebuah bank digital",
  );

  // Watches every change of the page while the reply streams.
  await page.evaluate(() => {
    window.__mic = { sawStreaming: false, offeredWhileStreaming: false };
    new MutationObserver(() => {
      if (!document.body.innerText.includes("Interviewer sedang menjawab…")) {
        return;
      }

      window.__mic.sawStreaming = true;

      if (
        Array.from(document.querySelectorAll("button")).some((button) =>
          /Jawab dengan suara|Berhenti/.test(button.textContent ?? ""),
        )
      ) {
        window.__mic.offeredWhileStreaming = true;
      }
    }).observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  });

  await page.getByRole("button", { name: "Kirim jawaban" }).click();
  await expect(conversation.getByText(SECOND_LINE)).toBeVisible();
  await expect(answer).toBeFocused();

  expect(await page.evaluate(() => window.__mic)).toEqual({
    sawStreaming: true,
    offeredWhileStreaming: false,
  });
  // Read a sentence at a time.
  expect(await page.evaluate(() => window.__spoken)).toEqual([
    "Menarik.",
    "Bagian mana dari pekerjaan itu yang paling kamu banggakan?",
  ]);
  await expect(
    page.getByText("Jawabanmu tadi kurang dari satu menit."),
  ).toBeVisible();
  await expectNoSeriousViolations(page);
});
