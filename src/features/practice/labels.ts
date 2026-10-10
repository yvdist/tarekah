import {
  PRACTICE_LANGUAGES,
  type PracticeLanguage,
} from "@/db/schema/enum-values";
import type { FeedbackAspect } from "./schemas";

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
