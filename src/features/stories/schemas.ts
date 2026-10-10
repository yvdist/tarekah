import { z } from "zod";
import { COMPETENCIES } from "@/db/schema/enum-values";
import { optionalText, requiredText } from "@/lib/form-schemas";

// Only the title is required: a story is often written in pieces, and a
// half-written one is still worth keeping.
export const storyFormSchema = z.object({
  title: requiredText(200, "Judul wajib diisi"),
  situation: optionalText(5000),
  task: optionalText(5000),
  action: optionalText(5000),
  result: optionalText(5000),
  competencies: z
    .array(z.enum(COMPETENCIES, "Pilihan tidak valid"))
    .max(COMPETENCIES.length)
    .transform((values) => [...new Set(values)]),
});

export type StoryFormInput = z.input<typeof storyFormSchema>;
export type StoryFormValues = z.output<typeof storyFormSchema>;

export const storyIdSchema = z.uuid();

export const competencySchema = z.enum(COMPETENCIES);

// Filters arrive from the URL, so anything unknown falls back to "all".
export const storyFilterSchema = z.object({
  q: z.string().catch(""),
  competency: competencySchema.or(z.literal("")).catch(""),
});

export type StoryFilter = z.output<typeof storyFilterSchema>;
