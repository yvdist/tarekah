import { z } from "zod";
import { MAX_SETTING_DAYS } from "./constants";

// Form fields arrive as strings.
const days = z
  .string()
  .trim()
  .regex(/^\d+$/, "Isi dengan angka bulat")
  .transform(Number)
  .refine((value) => value >= 1 && value <= MAX_SETTING_DAYS, {
    message: `Isi antara 1 dan ${MAX_SETTING_DAYS} hari`,
  });

export const followUpSettingsSchema = z
  .object({
    followUpAfterDays: days,
    ghostedAfterDays: days,
  })
  .refine((value) => value.ghostedAfterDays > value.followUpAfterDays, {
    path: ["ghostedAfterDays"],
    message: "Harus lebih besar dari batas follow-up",
  });

export type FollowUpSettingsInput = z.input<typeof followUpSettingsSchema>;
export type FollowUpSettingsValues = z.output<typeof followUpSettingsSchema>;
