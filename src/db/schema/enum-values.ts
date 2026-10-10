// Plain tuples with no Drizzle import, so Zod schemas and Client Components can
// share the allowed values without pulling the database layer into the bundle.
export const APPLICATION_STATUSES = [
  "wishlist",
  "applied",
  "screening",
  "technical_test",
  "interview",
  "offer",
  "rejected",
  "ghosted",
] as const;

export const JOB_SOURCES = [
  "linkedin",
  "glints",
  "kalibrr",
  "jobstreet",
  "referral",
  "other",
] as const;

export const WORK_TYPES = ["onsite", "hybrid", "remote"] as const;

export const DOCUMENT_TYPES = ["cv", "cover_letter"] as const;

export const INTERVIEW_STAGES = [
  "hr",
  "technical",
  "user",
  "final",
  "other",
] as const;

export const CONTACT_ROLES = [
  "recruiter",
  "referral",
  "hiring_manager",
  "other",
] as const;

export const COMPETENCIES = [
  "ownership",
  "conflict",
  "failure",
  "technical_depth",
  "leadership",
  "ambiguity",
  "collaboration",
  "impact",
] as const;

export const QUESTION_CATEGORIES = [
  "behavioral",
  "technical_backend",
  "system_design",
  "ai_llm",
  "hr_general",
  "other",
] as const;

// "ai" marks a question saved from practice feedback.
export const QUESTION_SOURCES = ["interview", "manual", "ai"] as const;

// Self-assessed by the user; never a score.
export const QUESTION_READINESS = ["not_ready", "somewhat", "ready"] as const;

// Whose API the user's own key belongs to (BYOK).
export const AI_PROVIDERS = ["anthropic", "openai", "google"] as const;

// A drill is one question and one answer; a simulation is a conversation.
export const PRACTICE_MODES = ["drill", "simulation"] as const;

// What a simulated interview is about. Not the same list as
// QUESTION_CATEGORIES: this describes a whole interview, not one question.
export const PRACTICE_INTERVIEW_TYPES = [
  "hr_screening",
  "behavioral",
  "technical_backend",
  "system_design_light",
  "ai_builder",
] as const;

export const PRACTICE_LEVELS = ["mid", "senior"] as const;

export const PRACTICE_LANGUAGES = ["id", "en"] as const;

export const PRACTICE_TONES = ["friendly", "neutral", "challenging"] as const;

export const PRACTICE_SESSION_STATUSES = [
  "in_progress",
  "completed",
  "abandoned",
] as const;

export const PRACTICE_TURN_ROLES = [
  "interviewer",
  "candidate",
  "system_event",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];
export type JobSource = (typeof JOB_SOURCES)[number];
export type WorkType = (typeof WORK_TYPES)[number];
export type DocumentType = (typeof DOCUMENT_TYPES)[number];
export type InterviewStage = (typeof INTERVIEW_STAGES)[number];
export type ContactRole = (typeof CONTACT_ROLES)[number];
export type Competency = (typeof COMPETENCIES)[number];
export type QuestionCategory = (typeof QUESTION_CATEGORIES)[number];
export type QuestionSource = (typeof QUESTION_SOURCES)[number];
export type QuestionReadiness = (typeof QUESTION_READINESS)[number];
export type AiProvider = (typeof AI_PROVIDERS)[number];
export type PracticeMode = (typeof PRACTICE_MODES)[number];
export type PracticeInterviewType = (typeof PRACTICE_INTERVIEW_TYPES)[number];
export type PracticeLevel = (typeof PRACTICE_LEVELS)[number];
export type PracticeLanguage = (typeof PRACTICE_LANGUAGES)[number];
export type PracticeTone = (typeof PRACTICE_TONES)[number];
export type PracticeSessionStatus = (typeof PRACTICE_SESSION_STATUSES)[number];
export type PracticeTurnRole = (typeof PRACTICE_TURN_ROLES)[number];
