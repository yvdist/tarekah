import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";

// Stands in for a provider when AI_FAKE_PROVIDER=1, which only the end-to-end
// tests set: they cannot call a real API. It answers a structured-output call
// with the feedback below, a streamed call with the interviewer's next line,
// and anything else with "ok".
export const FAKE_FEEDBACK = {
  strengths: [
    "Jawabanmu langsung menyebut situasi dan peranmu di dalamnya.",
    "Ada hasil yang bisa diukur di akhir cerita.",
  ],
  improvements: [
    {
      aspect: "structure",
      note: "Pisahkan apa yang kamu putuskan dari apa yang dikerjakan tim.",
    },
    {
      aspect: "conciseness",
      note: "Latar belakangnya bisa diringkas jadi satu kalimat.",
    },
  ],
  improvedAnswer:
    "Waktu itu sistem kami lambat di jam sibuk. Saya mengusulkan pemindahan bertahap, memimpin migrasinya, dan waktu respons turun setengahnya.",
  followUpQuestion: "Apa yang akan kamu lakukan berbeda kalau mengulanginya?",
};

// The closing summary of a simulation. It points at no story: the fake does
// not know which ones the user has.
export const FAKE_SUMMARY = {
  overallStrengths: [
    "Kamu menjawab dengan runtut dan tidak terburu-buru.",
    "Contoh yang kamu pilih dekat dengan pekerjaan yang dilamar.",
  ],
  focusAreas: [
    {
      aspect: "specificity",
      note: "Sebut satu angka atau hasil nyata di tiap cerita.",
    },
  ],
  perQuestion: [
    {
      question: "Boleh ceritakan sedikit tentang dirimu?",
      note: "Pembukaannya jelas, tapi belum menyebut kenapa kamu melamar.",
      improvedAnswerHint:
        "Tutup dengan satu kalimat yang menghubungkan pengalamanmu ke posisi ini.",
    },
  ],
  extractedQuestions: [
    "Boleh ceritakan sedikit tentang dirimu dan pekerjaanmu sekarang?",
    "Bagian mana dari pekerjaanmu yang paling kamu banggakan?",
  ],
  storySuggestions: [
    {
      question: "Bagian mana dari pekerjaanmu yang paling kamu banggakan?",
      storyId: null,
      suggestion:
        "Tulis satu cerita tentang hasil kerja yang paling kamu banggakan.",
    },
  ],
};

// What the interviewer says in a simulation, one line per turn. The line is
// picked by how many times the interviewer has spoken, so a session reads the
// same on every run.
export const FAKE_INTERVIEWER_LINES = [
  "Terima kasih sudah meluangkan waktu. Boleh ceritakan sedikit tentang dirimu dan pekerjaanmu sekarang?",
  "Menarik. Bagian mana dari pekerjaan itu yang paling kamu banggakan?",
  "Baik. Ceritakan satu keputusan teknis yang sulit dan bagaimana kamu mengambilnya.",
  "Saya mengerti. Ada yang ingin kamu tanyakan ke kami?",
  "Terima kasih, itu saja dari saya. Senang berbincang denganmu.",
];

const FAKE_USAGE = {
  inputTokens: {
    total: 1,
    noCache: 1,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
};

// The two structured calls are told apart by the shape they ask for.
const asksForSummary = (schema: unknown) =>
  JSON.stringify(schema ?? {}).includes('"overallStrengths"');

// Long enough between words for a test to see the text arrive in pieces.
const FAKE_WORD_DELAY_MS = 20;

export function createFakeModel(modelId: string) {
  return new MockLanguageModelV4({
    provider: "fake",
    modelId,
    doStream: async ({ prompt }) => {
      const spoken = prompt.filter(
        (message) => message.role === "assistant",
      ).length;
      const line =
        FAKE_INTERVIEWER_LINES[spoken % FAKE_INTERVIEWER_LINES.length];

      return {
        stream: simulateReadableStream({
          chunkDelayInMs: FAKE_WORD_DELAY_MS,
          chunks: [
            { type: "stream-start" as const, warnings: [] },
            { type: "text-start" as const, id: "text-1" },
            ...line.split(/(?<= )/).map((delta) => ({
              type: "text-delta" as const,
              id: "text-1",
              delta,
            })),
            { type: "text-end" as const, id: "text-1" },
            {
              type: "finish" as const,
              finishReason: { unified: "stop" as const, raw: undefined },
              usage: FAKE_USAGE,
            },
          ],
        }),
      };
    },
    doGenerate: async ({ responseFormat }) => ({
      content: [
        {
          type: "text",
          text:
            responseFormat?.type === "json"
              ? JSON.stringify(
                  asksForSummary(responseFormat.schema)
                    ? FAKE_SUMMARY
                    : FAKE_FEEDBACK,
                )
              : "ok",
        },
      ],
      finishReason: { unified: "stop", raw: undefined },
      usage: FAKE_USAGE,
      warnings: [],
    }),
  });
}
