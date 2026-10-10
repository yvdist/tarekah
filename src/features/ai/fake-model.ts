import { MockLanguageModelV4 } from "ai/test";

// Stands in for a provider when AI_FAKE_PROVIDER=1, which only the end-to-end
// tests set: they cannot call a real API. It answers a structured-output call
// with the feedback below and anything else with "ok".
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

export function createFakeModel(modelId: string) {
  return new MockLanguageModelV4({
    provider: "fake",
    modelId,
    doGenerate: async ({ responseFormat }) => ({
      content: [
        {
          type: "text",
          text:
            responseFormat?.type === "json"
              ? JSON.stringify(FAKE_FEEDBACK)
              : "ok",
        },
      ],
      finishReason: { unified: "stop", raw: undefined },
      usage: {
        inputTokens: {
          total: 1,
          noCache: 1,
          cacheRead: undefined,
          cacheWrite: undefined,
        },
        outputTokens: { total: 1, text: 1, reasoning: undefined },
      },
      warnings: [],
    }),
  });
}
