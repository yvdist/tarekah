import { z } from "zod";
import {
  AI_PROVIDERS,
  PRACTICE_INTERVIEW_TYPES,
  PRACTICE_LANGUAGES,
  PRACTICE_LEVELS,
  PRACTICE_TONES,
} from "@/db/schema/enum-values";
import { optionalId } from "@/lib/form-schemas";
import { CONTROL_KINDS, SIMULATION_DURATIONS } from "./simulation";

// Long enough for a five-minute spoken answer written out, short enough to
// keep one request to the user's provider small.
export const ANSWER_MAX_LENGTH = 6000;

export const practiceLanguageSchema = z.enum(PRACTICE_LANGUAGES);

const answerText = z
  .string()
  .trim()
  .min(1, "Tulis jawabanmu dulu")
  .max(ANSWER_MAX_LENGTH, `Maksimal ${ANSWER_MAX_LENGTH} karakter`);

// One attempt at one question.
export const drillAnswerSchema = z.object({
  questionId: z.uuid(),
  answer: answerText,
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

// The settings a simulation starts with.
export const simulationSettingsSchema = z.object({
  applicationId: optionalId,
  interviewType: z.enum(PRACTICE_INTERVIEW_TYPES),
  level: z.enum(PRACTICE_LEVELS),
  language: practiceLanguageSchema,
  tone: z.enum(PRACTICE_TONES),
  duration: z.enum(SIMULATION_DURATIONS),
});

export type SimulationSettingsInput = z.input<typeof simulationSettingsSchema>;
export type SimulationSettings = z.output<typeof simulationSettingsSchema>;

// The answer box of a simulation.
export const simulationAnswerSchema = z.object({ text: answerText });

export type SimulationAnswerInput = z.input<typeof simulationAnswerSchema>;

// What the candidate sends in a simulation: an answer, or one of the two
// phrases, whose text the server writes itself.
export const simulationTurnSchema = z.discriminatedUnion("kind", [
  simulationAnswerSchema.extend({
    sessionId: sessionIdSchema,
    kind: z.literal("answer"),
  }),
  z.object({ sessionId: sessionIdSchema, kind: z.enum(CONTROL_KINDS) }),
]);

export type SimulationTurnInput = z.input<typeof simulationTurnSchema>;

// What produced an interviewer's turn. It lives in practice_turns.feedback,
// the one jsonb column a turn has.
export const turnOriginSchema = z.object({
  promptVersion: z.string(),
  provider: z.enum(AI_PROVIDERS),
  model: z.string(),
});

export type TurnOrigin = z.infer<typeof turnOriginSchema>;

// The closing summary of a simulation, as the model answers it. Required and
// unbounded like feedbackSchema, for the same reason; `storyId` is nullable
// rather than optional. No score here either.
export const simulationSummarySchema = z.object({
  overallStrengths: z.array(z.string()),
  focusAreas: z.array(
    z.object({ aspect: z.enum(FEEDBACK_ASPECTS), note: z.string() }),
  ),
  perQuestion: z.array(
    z.object({
      question: z.string(),
      note: z.string(),
      improvedAnswerHint: z.string(),
    }),
  ),
  extractedQuestions: z.array(z.string()),
  storySuggestions: z.array(
    z.object({
      question: z.string(),
      storyId: z.string().nullable(),
      suggestion: z.string(),
    }),
  ),
});

export type SimulationSummary = z.infer<typeof simulationSummarySchema>;

// What practice_sessions.summary holds.
export const storedSummarySchema = z.object({
  promptVersion: z.string(),
  provider: z.enum(AI_PROVIDERS),
  model: z.string(),
  result: simulationSummarySchema,
});

export type StoredSummary = z.infer<typeof storedSummarySchema>;

export const summaryIndexSchema = z.int().min(0).max(999);

export const summaryIndexesSchema = z
  .array(summaryIndexSchema)
  .min(1, "Pilih setidaknya satu pertanyaan")
  .max(100);
