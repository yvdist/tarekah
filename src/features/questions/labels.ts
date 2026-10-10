import {
  QUESTION_CATEGORIES,
  QUESTION_READINESS,
  QUESTION_SOURCES,
  type QuestionCategory,
  type QuestionReadiness,
  type QuestionSource,
} from "@/db/schema/enum-values";

export const QUESTION_CATEGORY_LABELS: Record<QuestionCategory, string> = {
  behavioral: "Behavioral",
  technical_backend: "Teknis backend",
  system_design: "System design",
  ai_llm: "AI dan LLM",
  hr_general: "HR umum",
  other: "Lainnya",
};

export const QUESTION_CATEGORY_OPTIONS = QUESTION_CATEGORIES.map((value) => ({
  value,
  label: QUESTION_CATEGORY_LABELS[value],
}));

export const QUESTION_SOURCE_LABELS: Record<QuestionSource, string> = {
  interview: "Dari interview",
  manual: "Ditulis sendiri",
  ai: "Dari latihan",
};

export const QUESTION_SOURCE_OPTIONS = QUESTION_SOURCES.map((value) => ({
  value,
  label: QUESTION_SOURCE_LABELS[value],
}));

// Self-assessed, so the words stay calm: no "weak", no score.
export const QUESTION_READINESS_LABELS: Record<QuestionReadiness, string> = {
  not_ready: "Belum siap",
  somewhat: "Cukup",
  ready: "Siap",
};

export const QUESTION_READINESS_OPTIONS = QUESTION_READINESS.map((value) => ({
  value,
  label: QUESTION_READINESS_LABELS[value],
}));
