import { describe, expect, it } from "vitest";
import { z } from "zod";
import { FAKE_FEEDBACK, FAKE_SUMMARY } from "@/features/ai/fake-model";
import {
  ANSWER_MAX_LENGTH,
  drillAnswerSchema,
  FEEDBACK_ASPECTS,
  feedbackSchema,
  simulationSettingsSchema,
  simulationSummarySchema,
  simulationTurnSchema,
  storedFeedbackSchema,
  storedSummarySchema,
  summaryIndexesSchema,
} from "./schemas";

const QUESTION_ID = "0b0f6a52-7c0e-4f6e-9a57-0d7d0f3f9a11";

const feedback = {
  strengths: ["Runtut."],
  improvements: [{ aspect: "structure", note: "Mulai dari hasilnya." }],
  improvedAnswer: "Versi yang lebih rapi.",
  followUpQuestion: "Apa yang kamu pelajari?",
};

describe("drillAnswerSchema", () => {
  it("trims the answer", () => {
    const parsed = drillAnswerSchema.parse({
      questionId: QUESTION_ID,
      answer: "  Jawaban saya.  ",
      language: "id",
    });

    expect(parsed.answer).toBe("Jawaban saya.");
  });

  it.each([
    ["an empty answer", { answer: "   " }],
    ["an answer over the limit", { answer: "a".repeat(ANSWER_MAX_LENGTH + 1) }],
    ["an id that is not a uuid", { questionId: "42" }],
    ["an unknown language", { language: "su" }],
  ])("rejects %s", (_, override) => {
    const result = drillAnswerSchema.safeParse({
      questionId: QUESTION_ID,
      answer: "Jawaban saya.",
      language: "id",
      ...override,
    });

    expect(result.success).toBe(false);
  });

  it("accepts an answer at the limit", () => {
    const result = drillAnswerSchema.safeParse({
      questionId: QUESTION_ID,
      answer: "a".repeat(ANSWER_MAX_LENGTH),
      language: "en",
    });

    expect(result.success).toBe(true);
  });
});

describe("feedbackSchema", () => {
  it("accepts the canned feedback of the end-to-end tests", () => {
    expect(feedbackSchema.parse(FAKE_FEEDBACK)).toEqual(FAKE_FEEDBACK);
  });

  it.each(FEEDBACK_ASPECTS)("accepts the aspect %s", (aspect) => {
    const result = feedbackSchema.safeParse({
      ...feedback,
      improvements: [{ aspect, note: "Catatan." }],
    });

    expect(result.success).toBe(true);
  });

  it("rejects an aspect it does not know", () => {
    const result = feedbackSchema.safeParse({
      ...feedback,
      improvements: [{ aspect: "confidence", note: "Catatan." }],
    });

    expect(result.success).toBe(false);
  });

  it.each(["strengths", "improvements", "improvedAnswer", "followUpQuestion"])(
    "requires %s",
    (field) => {
      const rest = Object.fromEntries(
        Object.entries(feedback).filter(([key]) => key !== field),
      );

      expect(feedbackSchema.safeParse(rest).success).toBe(false);
    },
  );

  it("has no place for a score", () => {
    const parsed = feedbackSchema.parse({
      ...feedback,
      score: 8,
      improvements: [{ aspect: "structure", note: "Catatan.", rating: 3 }],
    });

    expect(JSON.stringify(parsed)).not.toMatch(/\d/);
    expect(Object.keys(parsed)).toEqual([
      "strengths",
      "improvements",
      "improvedAnswer",
      "followUpQuestion",
    ]);
  });
});

describe("storedFeedbackSchema", () => {
  const stored = {
    promptVersion: "drill-feedback-v1",
    provider: "anthropic",
    model: "claude-sonnet-5-5",
    result: feedback,
  };

  it("reads back what was stored", () => {
    expect(storedFeedbackSchema.parse(stored)).toEqual(stored);
  });

  it.each([
    ["nothing", null],
    ["feedback without its envelope", feedback],
    ["an unknown provider", { ...stored, provider: "mistral" }],
    ["a broken result", { ...stored, result: { strengths: [] } }],
  ])("rejects %s", (_, value) => {
    expect(storedFeedbackSchema.safeParse(value).success).toBe(false);
  });
});

describe("simulationSettingsSchema", () => {
  const settings = {
    applicationId: "",
    interviewType: "behavioral",
    level: "mid",
    language: "en",
    tone: "friendly",
    duration: "15",
  };

  it("reads no application as null", () => {
    expect(simulationSettingsSchema.parse(settings)).toEqual({
      ...settings,
      applicationId: null,
    });
  });

  it("keeps a chosen application", () => {
    expect(
      simulationSettingsSchema.parse({
        ...settings,
        applicationId: QUESTION_ID,
      }).applicationId,
    ).toBe(QUESTION_ID);
  });

  it.each([
    ["an unknown type", { interviewType: "panel" }],
    ["an unknown level", { level: "junior" }],
    ["an unknown tone", { tone: "hostile" }],
    ["an unknown language", { language: "fr" }],
    ["a duration that is not offered", { duration: "45" }],
    ["a number of turns", { duration: 6 }],
    ["an application id that is not one", { applicationId: "1" }],
  ])("refuses %s", (_, change) => {
    expect(
      simulationSettingsSchema.safeParse({ ...settings, ...change }).success,
    ).toBe(false);
  });
});

describe("simulationTurnSchema", () => {
  it("trims an answer", () => {
    expect(
      simulationTurnSchema.parse({
        sessionId: QUESTION_ID,
        kind: "answer",
        text: "  Jawaban.  ",
      }),
    ).toEqual({ sessionId: QUESTION_ID, kind: "answer", text: "Jawaban." });
  });

  it("refuses an empty or oversized answer", () => {
    const parse = (text: string) =>
      simulationTurnSchema.safeParse({
        sessionId: QUESTION_ID,
        kind: "answer",
        text,
      }).success;

    expect(parse("   ")).toBe(false);
    expect(parse("a".repeat(ANSWER_MAX_LENGTH))).toBe(true);
    expect(parse("a".repeat(ANSWER_MAX_LENGTH + 1))).toBe(false);
  });

  it("takes a request to repeat or to think without any text", () => {
    expect(
      simulationTurnSchema.parse({
        sessionId: QUESTION_ID,
        kind: "repeat",
        text: "teks dari client yang diabaikan",
      }),
    ).toEqual({ sessionId: QUESTION_ID, kind: "repeat" });
    expect(
      simulationTurnSchema.safeParse({ sessionId: QUESTION_ID, kind: "think" })
        .success,
    ).toBe(true);
  });

  it("refuses another kind of turn", () => {
    expect(
      simulationTurnSchema.safeParse({ sessionId: QUESTION_ID, kind: "end" })
        .success,
    ).toBe(false);
  });
});

describe("simulationSummarySchema", () => {
  const summary = {
    overallStrengths: ["Runtut."],
    focusAreas: [{ aspect: "structure", note: "Mulai dari hasil." }],
    perQuestion: [
      { question: "Apa?", note: "Jelas.", improvedAnswerHint: "Tambah angka." },
    ],
    extractedQuestions: ["Apa?"],
    storySuggestions: [
      { question: "Apa?", storyId: null, suggestion: "Tulis cerita." },
    ],
  };

  it("accepts a summary with or without a story id", () => {
    expect(simulationSummarySchema.parse(summary)).toEqual(summary);
    expect(
      simulationSummarySchema.safeParse({
        ...summary,
        storySuggestions: [
          { question: "Apa?", storyId: QUESTION_ID, suggestion: "Pakai." },
        ],
      }).success,
    ).toBe(true);
  });

  it("has no optional field: a missing one is refused", () => {
    for (const missing of Object.keys(summary)) {
      const rest = Object.fromEntries(
        Object.entries(summary).filter(([key]) => key !== missing),
      );

      expect(simulationSummarySchema.safeParse(rest).success).toBe(false);
    }

    expect(
      simulationSummarySchema.safeParse({
        ...summary,
        storySuggestions: [{ question: "Apa?", suggestion: "Tulis." }],
      }).success,
    ).toBe(false);
  });

  it("has no field for a score", () => {
    const shape = JSON.stringify(z.toJSONSchema(simulationSummarySchema));

    expect(shape).not.toMatch(/score|rating|grade|number|integer/i);
  });

  it("accepts the canned summary of the fake provider", () => {
    expect(simulationSummarySchema.parse(FAKE_SUMMARY)).toEqual(FAKE_SUMMARY);
  });

  it("reads a stored summary with what produced it", () => {
    const stored = {
      promptVersion: "simulation-summary-v1",
      provider: "deepseek",
      model: "deepseek-flash",
      result: summary,
    };

    expect(storedSummarySchema.parse(stored)).toEqual(stored);
    expect(storedSummarySchema.safeParse(summary).success).toBe(false);
    expect(storedSummarySchema.safeParse(null).success).toBe(false);
  });
});

describe("summaryIndexesSchema", () => {
  it("takes positions in the summary and nothing else", () => {
    expect(summaryIndexesSchema.parse([0, 2])).toEqual([0, 2]);
    expect(summaryIndexesSchema.safeParse([]).success).toBe(false);
    expect(summaryIndexesSchema.safeParse([-1]).success).toBe(false);
    expect(summaryIndexesSchema.safeParse([1.5]).success).toBe(false);
    expect(summaryIndexesSchema.safeParse(["0"]).success).toBe(false);
  });
});
