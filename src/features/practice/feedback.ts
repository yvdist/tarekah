import { generateText, type LanguageModel, Output } from "ai";
import { QUESTION_MAX_LENGTH } from "@/features/questions/schemas";
import {
  buildDrillFeedbackPrompt,
  type DrillFeedbackContext,
} from "./prompts/drill-feedback";
import { type Feedback, feedbackSchema } from "./schemas";

// Shorter than the page's maxDuration, so the user reads a message instead of
// a request the platform cut.
const FEEDBACK_TIMEOUT_MS = 45_000;

// Room for the answer rewritten plus the notes, with slack for models that
// spend output tokens on thinking.
const FEEDBACK_MAX_OUTPUT_TOKENS = 4000;

const MAX_STRENGTHS = 4;
const MAX_IMPROVEMENTS = 5;

// Asks the model for feedback on one answer. It throws what the SDK throws;
// the caller turns that into a message with reportAiError and never logs it.
export async function generateDrillFeedback({
  model,
  ...context
}: DrillFeedbackContext & { model: LanguageModel }): Promise<Feedback> {
  const { instructions, prompt } = buildDrillFeedbackPrompt(context);
  const { output } = await generateText({
    model,
    instructions,
    prompt,
    output: Output.object({ schema: feedbackSchema }),
    maxOutputTokens: FEEDBACK_MAX_OUTPUT_TOKENS,
    maxRetries: 1,
    timeout: FEEDBACK_TIMEOUT_MS,
  });

  return tidyFeedback(output);
}

// The schema cannot bound what the model writes, so the bounds are applied
// here: no blank items, no endless lists, and a follow-up question that fits
// the question bank.
export function tidyFeedback(feedback: Feedback): Feedback {
  return {
    strengths: feedback.strengths
      .map((strength) => strength.trim())
      .filter((strength) => strength !== "")
      .slice(0, MAX_STRENGTHS),
    improvements: feedback.improvements
      .map(({ aspect, note }) => ({ aspect, note: note.trim() }))
      .filter(({ note }) => note !== "")
      .slice(0, MAX_IMPROVEMENTS),
    improvedAnswer: feedback.improvedAnswer.trim(),
    followUpQuestion: feedback.followUpQuestion
      .trim()
      .slice(0, QUESTION_MAX_LENGTH),
  };
}
