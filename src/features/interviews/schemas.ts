import { z } from "zod";
import { INTERVIEW_STAGES } from "@/db/schema/enum-values";
import { interviewQuestionsSchema } from "@/features/questions/schemas";
import { optionalText } from "@/lib/form-schemas";
import { parseDateTimeLocal } from "./format";

export const interviewFormSchema = z.object({
  scheduledAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Tanggal dan jam wajib diisi")
    .transform(parseDateTimeLocal)
    .refine((value) => !Number.isNaN(value.getTime()), {
      message: "Tanggal tidak valid",
    }),
  stage: z.enum(INTERVIEW_STAGES, "Pilih tahap interview"),
  interviewers: optionalText(500),
  // Rows of the list editor; they are written to the questions table, not to
  // the interview itself.
  questions: interviewQuestionsSchema,
  reflection: optionalText(10_000),
});

export type InterviewFormInput = z.input<typeof interviewFormSchema>;
export type InterviewFormValues = z.output<typeof interviewFormSchema>;

export const interviewIdSchema = z.uuid();

export const interviewStageSchema = z.enum(INTERVIEW_STAGES);
