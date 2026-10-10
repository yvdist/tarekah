import {
  PRACTICE_INTERVIEW_TYPES,
  PRACTICE_LANGUAGES,
  PRACTICE_LEVELS,
  PRACTICE_TONES,
  type PracticeInterviewType,
  type PracticeLanguage,
  type PracticeLevel,
  type PracticeSessionStatus,
  type PracticeTone,
} from "@/db/schema/enum-values";
import type { FeedbackAspect } from "./schemas";
import { SIMULATION_DURATIONS } from "./simulation";

export const FEEDBACK_ASPECT_LABELS: Record<FeedbackAspect, string> = {
  structure: "Struktur",
  specificity: "Kekonkretan",
  relevance: "Relevansi",
  technical_clarity: "Kejelasan teknis",
  conciseness: "Keringkasan",
};

export const PRACTICE_LANGUAGE_LABELS: Record<PracticeLanguage, string> = {
  id: "Indonesia",
  en: "Inggris",
};

export const PRACTICE_LANGUAGE_OPTIONS = PRACTICE_LANGUAGES.map((value) => ({
  value,
  label: PRACTICE_LANGUAGE_LABELS[value],
}));

export const INTERVIEW_TYPE_LABELS: Record<PracticeInterviewType, string> = {
  hr_screening: "HR",
  behavioral: "Behavioral",
  technical_backend: "Teknis backend",
  system_design_light: "System design ringan",
  ai_builder: "AI builder",
};

export const INTERVIEW_TYPE_OPTIONS = PRACTICE_INTERVIEW_TYPES.map((value) => ({
  value,
  label: INTERVIEW_TYPE_LABELS[value],
}));

export const PRACTICE_LEVEL_LABELS: Record<PracticeLevel, string> = {
  mid: "Mid",
  senior: "Senior",
};

export const PRACTICE_LEVEL_OPTIONS = PRACTICE_LEVELS.map((value) => ({
  value,
  label: PRACTICE_LEVEL_LABELS[value],
}));

export const PRACTICE_TONE_LABELS: Record<PracticeTone, string> = {
  friendly: "Ramah",
  neutral: "Netral",
  challenging: "Menantang",
};

export const PRACTICE_TONE_OPTIONS = PRACTICE_TONES.map((value) => ({
  value,
  label: PRACTICE_TONE_LABELS[value],
}));

export const SIMULATION_DURATION_OPTIONS = SIMULATION_DURATIONS.map(
  (value) => ({ value, label: `${value} menit` }),
);

// A session left alone is not a failure, so the word for it is plain.
export const SESSION_STATUS_LABELS: Record<PracticeSessionStatus, string> = {
  in_progress: "Berjalan",
  completed: "Selesai",
  abandoned: "Tidak dilanjutkan",
};
