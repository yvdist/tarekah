import { generateText, type LanguageModel, Output } from "ai";
import { AI_PROVIDER_OPTIONS } from "@/features/ai/provider-options";
import { QUESTION_MAX_LENGTH } from "@/features/questions/schemas";
import {
  buildSimulationSummaryPrompt,
  type SimulationSummaryContext,
} from "./prompts/simulation-summary";
import { normalizeQuestionText } from "./same-question";
import { type SimulationSummary, simulationSummarySchema } from "./schemas";

// Shorter than the page's maxDuration. A summary has a note per question, so
// it takes longer to write than the feedback on one answer.
const SUMMARY_TIMEOUT_MS = 90_000;

const SUMMARY_MAX_OUTPUT_TOKENS = 8000;

const MAX_STRENGTHS = 4;

// More than three things to work on is a list nobody acts on.
export const MAX_FOCUS_AREAS = 3;

// A session has at most ten answers; this leaves room and still ends.
const MAX_QUESTIONS = 20;

// Asks the model for the closing summary of a simulation. It throws what the
// SDK throws; the caller turns that into a message with reportAiError and
// never logs it.
export async function generateSimulationSummary({
  model,
  ...context
}: SimulationSummaryContext & {
  model: LanguageModel;
}): Promise<SimulationSummary> {
  const { instructions, prompt } = buildSimulationSummaryPrompt(context);
  const { output } = await generateText({
    model,
    instructions,
    prompt,
    output: Output.object({ schema: simulationSummarySchema }),
    providerOptions: AI_PROVIDER_OPTIONS,
    maxOutputTokens: SUMMARY_MAX_OUTPUT_TOKENS,
    maxRetries: 1,
    timeout: SUMMARY_TIMEOUT_MS,
  });

  return tidySummary(
    output,
    context.stories.map((story) => story.id),
  );
}

const asQuestion = (text: string) => text.trim().slice(0, QUESTION_MAX_LENGTH);

// The schema cannot bound what the model writes, so the bounds are applied
// here: no blank items, no endless lists, questions that fit the bank and are
// not repeated, and no story the model was not shown. A suggestion pointing at
// an id that was not in the prompt keeps its advice and loses the id.
export function tidySummary(
  summary: SimulationSummary,
  storyIds: ReadonlyArray<string>,
): SimulationSummary {
  const seen = new Set<string>();

  return {
    overallStrengths: summary.overallStrengths
      .map((strength) => strength.trim())
      .filter((strength) => strength !== "")
      .slice(0, MAX_STRENGTHS),
    focusAreas: summary.focusAreas
      .map(({ aspect, note }) => ({ aspect, note: note.trim() }))
      .filter(({ note }) => note !== "")
      .slice(0, MAX_FOCUS_AREAS),
    perQuestion: summary.perQuestion
      .map((item) => ({
        question: asQuestion(item.question),
        note: item.note.trim(),
        improvedAnswerHint: item.improvedAnswerHint.trim(),
      }))
      .filter(({ question, note }) => question !== "" && note !== "")
      .slice(0, MAX_QUESTIONS),
    extractedQuestions: summary.extractedQuestions
      .map(asQuestion)
      .filter((question) => {
        const key = normalizeQuestionText(question);

        if (key === "" || seen.has(key)) {
          return false;
        }

        seen.add(key);

        return true;
      })
      .slice(0, MAX_QUESTIONS),
    storySuggestions: summary.storySuggestions
      .map((item) => ({
        question: asQuestion(item.question),
        storyId:
          item.storyId && storyIds.includes(item.storyId) ? item.storyId : null,
        suggestion: item.suggestion.trim(),
      }))
      .filter(
        ({ question, suggestion }) => question !== "" && suggestion !== "",
      )
      .slice(0, MAX_QUESTIONS),
  };
}
