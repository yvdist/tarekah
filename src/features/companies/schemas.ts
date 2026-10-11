import { z } from "zod";
import { optionalHttpUrl, optionalText } from "@/lib/form-schemas";

// As much as the interviewer's prompt reads of a company's notes
// (COMPANY_NOTES_MAX in practice/prompts/blocks.ts), so nothing the user
// writes is silently left out.
export const COMPANY_NOTES_MAX_LENGTH = 2000;

// What can be changed about a company. Its name comes from the applications
// that created it and is not edited here.
export const companyFormSchema = z.object({
  website: optionalHttpUrl("https://perusahaan.com"),
  notes: optionalText(COMPANY_NOTES_MAX_LENGTH),
});

export type CompanyFormInput = z.input<typeof companyFormSchema>;
export type CompanyFormValues = z.output<typeof companyFormSchema>;

export const companyIdSchema = z.uuid();
