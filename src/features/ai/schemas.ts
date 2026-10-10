import { z } from "zod";
import { AI_PROVIDERS } from "@/db/schema/enum-values";

export const AI_KEY_MAX_LENGTH = 300;
export const AI_MODEL_MAX_LENGTH = 100;

export const aiProviderSchema = z.enum(AI_PROVIDERS, "Pilih provider");

// The key may be left empty when one is already saved for the provider: the
// form then only changes the model. The action decides which case it is.
export const aiCredentialFormSchema = z.object({
  provider: aiProviderSchema,
  apiKey: z
    .string()
    .trim()
    .max(AI_KEY_MAX_LENGTH, `Maksimal ${AI_KEY_MAX_LENGTH} karakter`)
    .refine((value) => value === "" || value.length >= 20, {
      message: "Key terlalu pendek. Salin seluruhnya dari provider.",
    })
    .refine((value) => !/\s/.test(value), {
      message: "Key tidak boleh mengandung spasi",
    }),
  model: z
    .string()
    .trim()
    .min(1, "Pilih atau isi ID model")
    .max(AI_MODEL_MAX_LENGTH, `Maksimal ${AI_MODEL_MAX_LENGTH} karakter`)
    .regex(/^[\w.:/-]*$/, "ID model hanya berisi huruf, angka, dan . : / - _"),
});

export type AiCredentialFormInput = z.input<typeof aiCredentialFormSchema>;
export type AiCredentialFormValues = z.output<typeof aiCredentialFormSchema>;
