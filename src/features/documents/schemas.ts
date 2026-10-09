import { z } from "zod";
import { DOCUMENT_TYPES } from "@/db/schema/enum-values";
import {
  optionalHttpUrl,
  optionalText,
  requiredText,
} from "@/lib/form-schemas";

export const documentFormSchema = z.object({
  type: z.enum(DOCUMENT_TYPES, "Pilih jenis dokumen"),
  label: requiredText(100, "Nama versi wajib diisi"),
  url: optionalHttpUrl("https://drive.google.com/file/d/…"),
  notes: optionalText(2000),
});

export type DocumentFormInput = z.input<typeof documentFormSchema>;
export type DocumentFormValues = z.output<typeof documentFormSchema>;

export const documentIdSchema = z.uuid();
