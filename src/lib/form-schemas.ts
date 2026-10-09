import { z } from "zod";

// Form fields arrive as strings. Empty optional fields become null.
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Maksimal ${max} karakter`)
    .transform((value) => (value === "" ? null : value));

export const requiredText = (max: number, message: string) =>
  z.string().trim().min(1, message).max(max, `Maksimal ${max} karakter`);

// http(s) only: the value is rendered as a link.
export const optionalHttpUrl = (example: string) =>
  z
    .string()
    .trim()
    .max(2000, "Maksimal 2000 karakter")
    .refine((value) => value === "" || z.httpUrl().safeParse(value).success, {
      message: `Isi dengan URL lengkap, misalnya ${example}`,
    })
    .transform((value) => (value === "" ? null : value));

// A select whose "nothing chosen" option is the empty string.
export const optionalId = z
  .string()
  .refine((value) => value === "" || z.uuid().safeParse(value).success, {
    message: "Pilihan tidak valid",
  })
  .transform((value) => (value === "" ? null : value));
