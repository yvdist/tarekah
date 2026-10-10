import { z } from "zod";
import {
  QUESTION_CATEGORIES,
  QUESTION_READINESS,
  QUESTION_SOURCES,
} from "@/db/schema/enum-values";
import { optionalId, optionalText, requiredText } from "@/lib/form-schemas";

export const QUESTION_MAX_LENGTH = 1000;

// A question written by hand on the Pertanyaan page.
export const questionFormSchema = z.object({
  text: requiredText(QUESTION_MAX_LENGTH, "Pertanyaan wajib diisi"),
  category: z.enum(QUESTION_CATEGORIES, "Pilih kategori"),
  applicationId: optionalId,
  notes: optionalText(2000),
});

export type QuestionFormInput = z.input<typeof questionFormSchema>;
export type QuestionFormValues = z.output<typeof questionFormSchema>;

export const questionIdSchema = z.uuid();
export const questionCategorySchema = z.enum(QUESTION_CATEGORIES);
export const questionReadinessSchema = z.enum(QUESTION_READINESS);
export const questionSourceSchema = z.enum(QUESTION_SOURCES);

// The stories a question is linked to, as chosen in the dialog.
export const questionStoryIdsSchema = z
  .array(z.uuid())
  .max(100)
  .transform((ids) => [...new Set(ids)]);

// The list editor in the interview form. A row with an id is an existing
// question, so editing its text keeps its readiness and story links. Blank
// rows are dropped rather than rejected: the editor always shows one.
export const interviewQuestionsSchema = z
  .array(
    z.object({
      id: optionalId,
      text: z
        .string()
        .trim()
        .max(QUESTION_MAX_LENGTH, `Maksimal ${QUESTION_MAX_LENGTH} karakter`),
    }),
  )
  .max(50, "Maksimal 50 pertanyaan per interview")
  .transform((rows) => rows.filter((row) => row.text !== ""));

export type InterviewQuestionRow = z.output<
  typeof interviewQuestionsSchema
>[number];

// Filters arrive from the URL, so anything unknown falls back to "all".
export const questionFilterSchema = z.object({
  q: z.string().catch(""),
  category: questionCategorySchema.or(z.literal("")).catch(""),
  readiness: questionReadinessSchema.or(z.literal("")).catch(""),
  source: questionSourceSchema.or(z.literal("")).catch(""),
  application: z.uuid().or(z.literal("")).catch(""),
});

export type QuestionFilter = z.output<typeof questionFilterSchema>;
