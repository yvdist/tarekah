import { z } from "zod";
import { AI_PROVIDERS, PRACTICE_LANGUAGES } from "@/db/schema/enum-values";

// Long enough for a five-minute spoken answer written out, short enough to
// keep one request to the user's provider small.
export const ANSWER_MAX_LENGTH = 6000;

export const practiceLanguageSchema = z.enum(PRACTICE_LANGUAGES);

// One attempt at one question.
export const drillAnswerSchema = z.object({
  questionId: z.uuid(),
  answer: z
    .string()
    .trim()
    .min(1, "Tulis jawabanmu dulu")
    .max(ANSWER_MAX_LENGTH, `Maksimal ${ANSWER_MAX_LENGTH} karakter`),
  language: practiceLanguageSchema,
});

export type DrillAnswerInput = z.input<typeof drillAnswerSchema>;

export const sessionIdSchema = z.uuid();

// What an answer can be sharpened on.
export const FEEDBACK_ASPECTS = [
  "structure",
  "specificity",
  "relevance",
  "technical_clarity",
  "conciseness",
] as const;

export type FeedbackAspect = (typeof FEEDBACK_ASPECTS)[number];

// The shape the model answers in. Every field is required and none is bounded:
// the providers' strict structured output accepts neither optional properties
// nor length limits. There is no score, and there must never be one.
export const feedbackSchema = z.object({
  strengths: z.array(z.string()),
  improvements: z.array(
    z.object({ aspect: z.enum(FEEDBACK_ASPECTS), note: z.string() }),
  ),
  improvedAnswer: z.string(),
  followUpQuestion: z.string(),
});

export type Feedback = z.infer<typeof feedbackSchema>;

// What practice_turns.feedback holds: the feedback and what produced it. Read
// back through this schema, since jsonb is untyped.
export const storedFeedbackSchema = z.object({
  promptVersion: z.string(),
  provider: z.enum(AI_PROVIDERS),
  model: z.string(),
  result: feedbackSchema,
});

export type StoredFeedback = z.infer<typeof storedFeedbackSchema>;
