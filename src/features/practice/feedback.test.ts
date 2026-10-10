import { APICallError } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import { classifyAiError } from "@/features/ai/errors";
import { createFakeModel, FAKE_FEEDBACK } from "@/features/ai/fake-model";
import { QUESTION_MAX_LENGTH } from "@/features/questions/schemas";
import { generateDrillFeedback, tidyFeedback } from "./feedback";
import type { Feedback } from "./schemas";

const context = {
  question: "Ceritakan proyek tersulitmu.",
  answer: "Saya memimpin migrasi basis data tanpa downtime.",
  stories: [],
  language: "id",
} as const;

const feedback: Feedback = {
  strengths: ["Langsung ke peranmu."],
  improvements: [{ aspect: "specificity", note: "Sebut angkanya." }],
  improvedAnswer: "Saya memimpin migrasi basis data, tanpa downtime.",
  followUpQuestion: "Apa risiko terbesarnya?",
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

describe("generateDrillFeedback", () => {
  it("returns the feedback the model wrote", async () => {
    const calls: unknown[] = [];
    const model = modelAnswering(JSON.stringify(feedback), calls);

    expect(await generateDrillFeedback({ model, ...context })).toEqual(
      feedback,
    );
    expect(calls).toHaveLength(1);
    // Structured output, with the user's text in the prompt and not in the
    // instructions.
    expect(calls[0]).toMatchObject({ responseFormat: { type: "json" } });
    expect(JSON.stringify(calls[0])).toContain("<answer>");
  });

  it("returns the canned feedback of the fake provider", async () => {
    const model = createFakeModel("claude-sonnet-5-5");

    expect(await generateDrillFeedback({ model, ...context })).toEqual(
      FAKE_FEEDBACK,
    );
  });

  it.each([
    ["text that is not JSON", "Maaf, saya tidak bisa."],
    ["JSON of another shape", JSON.stringify({ score: 7 })],
    [
      "an aspect outside the list",
      JSON.stringify({
        ...feedback,
        improvements: [{ aspect: "confidence", note: "Lebih yakin." }],
      }),
    ],
  ])("fails as unreadable output on %s", async (_, text) => {
    const error = await generateDrillFeedback({
      model: modelAnswering(text),
      ...context,
    }).catch((caught: unknown) => caught);

    expect(classifyAiError(error)).toBe("bad_output");
  });

  it("passes a provider error on to be classified", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: async () => {
        throw new APICallError({
          message: "invalid x-api-key",
          url: "https://api.example.com/v1/messages",
          requestBodyValues: {},
          statusCode: 401,
          isRetryable: false,
          data: { type: "error", error: { type: "authentication_error" } },
        });
      },
    });
    const error = await generateDrillFeedback({ model, ...context }).catch(
      (caught: unknown) => caught,
    );

    expect(classifyAiError(error)).toBe("invalid_key");
  });
});

describe("tidyFeedback", () => {
  it("trims, drops blank items and bounds the lists", () => {
    const tidy = tidyFeedback({
      strengths: ["  Satu. ", "", "Dua.", "Tiga.", "Empat.", "Lima."],
      improvements: [
        { aspect: "structure", note: " A " },
        { aspect: "specificity", note: "   " },
        { aspect: "relevance", note: "B" },
        { aspect: "technical_clarity", note: "C" },
        { aspect: "conciseness", note: "D" },
        { aspect: "structure", note: "E" },
        { aspect: "structure", note: "F" },
      ],
      improvedAnswer: "\nVersi rapi.\n",
      followUpQuestion: `  ${"a".repeat(QUESTION_MAX_LENGTH + 50)}`,
    });

    expect(tidy.strengths).toEqual(["Satu.", "Dua.", "Tiga.", "Empat."]);
    expect(tidy.improvements.map(({ note }) => note)).toEqual([
      "A",
      "B",
      "C",
      "D",
      "E",
    ]);
    expect(tidy.improvedAnswer).toBe("Versi rapi.");
    expect(tidy.followUpQuestion).toHaveLength(QUESTION_MAX_LENGTH);
  });
});
