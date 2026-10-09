import { z } from "zod";
import {
  APPLICATION_STATUSES,
  JOB_SOURCES,
  WORK_TYPES,
} from "@/db/schema/enum-values";
import { optionalHttpUrl, optionalId, optionalText } from "@/lib/form-schemas";

// Postgres integer upper bound; salary columns are integer.
const MAX_INTEGER = 2_147_483_647;

const optionalSalary = z
  .string()
  .trim()
  .regex(/^\d*$/, "Isi dengan angka bulat tanpa titik atau koma")
  .transform((value) => (value === "" ? null : Number(value)))
  .refine((value) => value === null || value <= MAX_INTEGER, {
    message: "Angka terlalu besar",
  });

export const applicationFormSchema = z
  .object({
    companyName: z
      .string()
      .trim()
      .min(1, "Nama perusahaan wajib diisi")
      .max(200, "Maksimal 200 karakter"),
    position: z
      .string()
      .trim()
      .min(1, "Posisi wajib diisi")
      .max(200, "Maksimal 200 karakter"),
    jobUrl: optionalHttpUrl("https://contoh.com/loker"),
    source: z.enum(JOB_SOURCES, "Pilih sumber lowongan"),
    sourceDetail: optionalText(200),
    salaryMin: optionalSalary,
    salaryMax: optionalSalary,
    location: optionalText(200),
    workType: z
      .enum([...WORK_TYPES, ""], "Pilih tipe kerja")
      .transform((value) => (value === "" ? null : value)),
    appliedAt: z
      .string()
      .refine(
        (value) => value === "" || z.iso.date().safeParse(value).success,
        {
          message: "Tanggal tidak valid",
        },
      )
      .transform((value) => (value === "" ? null : value)),
    status: z.enum(APPLICATION_STATUSES, "Pilih status"),
    cvDocumentId: optionalId,
    coverLetterDocumentId: optionalId,
    notes: optionalText(10_000),
  })
  // Mirrors applications_salary_range_check in the database.
  .refine(
    (value) =>
      value.salaryMin === null ||
      value.salaryMax === null ||
      value.salaryMin <= value.salaryMax,
    {
      path: ["salaryMax"],
      message: "Gaji maksimum tidak boleh lebih kecil dari gaji minimum",
    },
  );

export type ApplicationFormInput = z.input<typeof applicationFormSchema>;
export type ApplicationFormValues = z.output<typeof applicationFormSchema>;

export const applicationIdSchema = z.uuid();

export const applicationStatusSchema = z.enum(APPLICATION_STATUSES);
