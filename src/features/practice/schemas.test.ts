import { describe, expect, it } from "vitest";
import { FAKE_FEEDBACK } from "@/features/ai/fake-model";
import {
  ANSWER_MAX_LENGTH,
  drillAnswerSchema,
  FEEDBACK_ASPECTS,
  feedbackSchema,
  storedFeedbackSchema,
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
