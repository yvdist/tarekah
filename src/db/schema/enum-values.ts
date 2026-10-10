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

// "ai" is reserved for questions suggested by a practice session (phase 2).
export const QUESTION_SOURCES = ["interview", "manual", "ai"] as const;

// Self-assessed by the user; never a score.
export const QUESTION_READINESS = ["not_ready", "somewhat", "ready"] as const;

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
