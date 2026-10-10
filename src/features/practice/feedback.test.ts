import { createDeepSeek } from "@ai-sdk/deepseek";
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

  // DeepSeek has no schema-constrained output and thinks unless told not to,
  // so this checks the request it is actually sent. The fetch is a stand-in:
  // nothing reaches the network.
  it("asks DeepSeek for JSON with the schema in the prompt and thinking off", async () => {
    const requests: Array<{ url: string; body: Record<string, unknown> }> = [];
    const deepseek = createDeepSeek({
      apiKey: "sk-not-a-real-key",
      fetch: async (input, init) => {
        requests.push({
          url: String(input),
          body: JSON.parse(String(init?.body)),
        });

        return Response.json({
          id: "chatcmpl-1",
          created: 1,
          model: "deepseek-flash",
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: JSON.stringify(feedback) },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        });
      },
    });

    expect(
      await generateDrillFeedback({
        model: deepseek("deepseek-flash"),
        ...context,
      }),
    ).toEqual(feedback);
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe("https://api.deepseek.com/chat/completions");
    expect(requests[0].body).toMatchObject({
      model: "deepseek-flash",
      response_format: { type: "json_object" },
      thinking: { type: "disabled" },
      max_tokens: 4000,
    });

    const system = JSON.stringify(requests[0].body.messages);

    // DeepSeek's JSON mode needs the word and the shape in the prompt.
    expect(system).toContain(
      "Return JSON that conforms to the following schema",
    );
    expect(system).toContain("followUpQuestion");
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
