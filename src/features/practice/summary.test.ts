import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import { classifyAiError } from "@/features/ai/errors";
import { createFakeModel, FAKE_SUMMARY } from "@/features/ai/fake-model";
import { QUESTION_MAX_LENGTH } from "@/features/questions/schemas";
import type { SimulationSummary } from "./schemas";
import {
  generateSimulationSummary,
  MAX_FOCUS_AREAS,
  tidySummary,
} from "./summary";

const STORY_ID = "0b0f6a52-7c0e-4f6e-9a57-0d7d0f3f9a11";
const OTHER_ID = "7c1f6a52-7c0e-4f6e-9a57-0d7d0f3f9a22";

const context = {
  interviewType: "behavioral",
  level: "mid",
  language: "id",
  application: null,
  turns: [
    { role: "interviewer", content: "Ceritakan proyek tersulitmu." },
    { role: "candidate", content: "Saya memimpin migrasi basis data." },
  ],
  stories: [
    {
      id: STORY_ID,
      title: "Migrasi",
      situation: null,
      task: null,
      action: null,
      result: null,
    },
  ],
} as const;

const summary: SimulationSummary = {
  overallStrengths: ["Langsung ke peranmu."],
  focusAreas: [{ aspect: "specificity", note: "Sebut angkanya." }],
  perQuestion: [
    {
      question: "Ceritakan proyek tersulitmu.",
      note: "Jelas, tapi tanpa hasil.",
      improvedAnswerHint: "Tutup dengan dampaknya.",
    },
  ],
  extractedQuestions: ["Ceritakan proyek tersulitmu."],
  storySuggestions: [
    {
      question: "Ceritakan proyek tersulitmu.",
      storyId: STORY_ID,
      suggestion: "Cerita migrasimu menjawab ini.",
    },
  ],
};

type Generate = NonNullable<
  ConstructorParameters<typeof MockLanguageModelV4>[0]
>["doGenerate"];

// A model that answers every call with the given text.
function modelAnswering(text: string, calls: unknown[] = []) {
  const doGenerate: Generate = async (options) => {
    calls.push(options);

    return {
      content: [{ type: "text", text }],
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
    };
  };

  return new MockLanguageModelV4({ doGenerate });
}

describe("generateSimulationSummary", () => {
  it("returns the summary the model wrote", async () => {
    const calls: unknown[] = [];
    const model = modelAnswering(JSON.stringify(summary), calls);

    expect(await generateSimulationSummary({ model, ...context })).toEqual(
      summary,
    );
    expect(calls).toHaveLength(1);
    // Structured output, with the session in the prompt and not in the
    // instructions.
    expect(calls[0]).toMatchObject({ responseFormat: { type: "json" } });
    expect(JSON.stringify(calls[0])).toContain("<transcript>");
    expect(JSON.stringify(calls[0])).toContain(`Id: ${STORY_ID}`);
  });

  it("drops a story id the model was not shown", async () => {
    const model = modelAnswering(
      JSON.stringify({
        ...summary,
        storySuggestions: [
          { question: "Apa?", storyId: OTHER_ID, suggestion: "Pakai ini." },
        ],
      }),
    );

    expect(
      (await generateSimulationSummary({ model, ...context })).storySuggestions,
    ).toEqual([{ question: "Apa?", storyId: null, suggestion: "Pakai ini." }]);
  });

  it("returns the canned summary of the fake provider", async () => {
    expect(
      await generateSimulationSummary({
        model: createFakeModel("fake"),
        ...context,
      }),
    ).toEqual(FAKE_SUMMARY);
  });

  it.each([
    ["text that is not JSON", "Maaf, saya tidak bisa."],
    ["JSON of another shape", JSON.stringify({ score: 7 })],
    [
      "a missing story id",
      JSON.stringify({
        ...summary,
        storySuggestions: [{ question: "Apa?", suggestion: "Tulis." }],
      }),
    ],
  ])("fails as unreadable output on %s", async (_, text) => {
    const error = await generateSimulationSummary({
      model: modelAnswering(text),
      ...context,
    }).catch((caught: unknown) => caught);

    expect(classifyAiError(error)).toBe("bad_output");
  });
});

describe("tidySummary", () => {
  it("trims, drops blank items and bounds the lists", () => {
    const tidy = tidySummary(
      {
        overallStrengths: [" Satu. ", "", "Dua.", "Tiga.", "Empat.", "Lima."],
        focusAreas: [
          { aspect: "structure", note: " A " },
          { aspect: "specificity", note: "  " },
          { aspect: "relevance", note: "B" },
          { aspect: "conciseness", note: "C" },
          { aspect: "technical_clarity", note: "D" },
        ],
        perQuestion: [
          { question: " Apa? ", note: " Jelas. ", improvedAnswerHint: " X " },
          { question: "", note: "Tanpa pertanyaan.", improvedAnswerHint: "" },
          { question: "Kenapa?", note: " ", improvedAnswerHint: "Y" },
        ],
        extractedQuestions: [],
        storySuggestions: [],
      },
      [],
    );

    expect(tidy.overallStrengths).toEqual(["Satu.", "Dua.", "Tiga.", "Empat."]);
    expect(tidy.focusAreas).toHaveLength(MAX_FOCUS_AREAS);
    expect(tidy.focusAreas.map(({ note }) => note)).toEqual(["A", "B", "C"]);
    expect(tidy.perQuestion).toEqual([
      { question: "Apa?", note: "Jelas.", improvedAnswerHint: "X" },
    ]);
  });

  it("keeps each question once, at a length the bank accepts", () => {
    const long = "a".repeat(QUESTION_MAX_LENGTH + 50);
    const tidy = tidySummary(
      {
        ...summary,
        extractedQuestions: [
          "Apa kelemahanmu?",
          "  apa  kelemahanmu ",
          "",
          long,
          "Kenapa pindah?",
        ],
      },
      [],
    );

    expect(tidy.extractedQuestions).toEqual([
      "Apa kelemahanmu?",
      "a".repeat(QUESTION_MAX_LENGTH),
      "Kenapa pindah?",
    ]);
  });

  it("keeps only the story ids it was given", () => {
    const tidy = tidySummary(
      {
        ...summary,
        storySuggestions: [
          { question: "Satu?", storyId: STORY_ID, suggestion: " Pakai. " },
          { question: "Dua?", storyId: OTHER_ID, suggestion: "Pakai." },
          { question: "Tiga?", storyId: null, suggestion: "Tulis." },
          { question: "Empat?", storyId: "bukan-id", suggestion: "Pakai." },
          { question: "", storyId: STORY_ID, suggestion: "Tanpa pertanyaan." },
          { question: "Lima?", storyId: STORY_ID, suggestion: "  " },
        ],
      },
      [STORY_ID],
    );

    expect(tidy.storySuggestions).toEqual([
      { question: "Satu?", storyId: STORY_ID, suggestion: "Pakai." },
      { question: "Dua?", storyId: null, suggestion: "Pakai." },
      { question: "Tiga?", storyId: null, suggestion: "Tulis." },
      { question: "Empat?", storyId: null, suggestion: "Pakai." },
    ]);
  });
});
