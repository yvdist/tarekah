import { z } from "zod";
import { CONTACT_ROLES } from "@/db/schema/enum-values";
import {
  optionalHttpUrl,
  optionalId,
  optionalText,
  requiredText,
} from "@/lib/form-schemas";

export const contactFormSchema = z.object({
  name: requiredText(200, "Nama wajib diisi"),
  role: z.enum(CONTACT_ROLES, "Pilih peran"),
  companyId: optionalId,
  email: z
    .string()
    .trim()
    .max(320, "Maksimal 320 karakter")
    .refine((value) => value === "" || z.email().safeParse(value).success, {
      message: "Email tidak valid",
    })
    .transform((value) => (value === "" ? null : value)),
  linkedinUrl: optionalHttpUrl("https://www.linkedin.com/in/nama"),
  notes: optionalText(5000),
  // Applications this contact is linked to.
  applicationIds: z
    .array(z.uuid())
    .max(500)
    .transform((ids) => [...new Set(ids)]),
});

export type ContactFormInput = z.input<typeof contactFormSchema>;
export type ContactFormValues = z.output<typeof contactFormSchema>;

export const contactIdSchema = z.uuid();
