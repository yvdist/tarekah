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

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];
export type JobSource = (typeof JOB_SOURCES)[number];
export type WorkType = (typeof WORK_TYPES)[number];
