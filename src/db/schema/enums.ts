import { pgEnum } from "drizzle-orm/pg-core";

export const applicationStatus = pgEnum("application_status", [
  "wishlist",
  "applied",
  "screening",
  "technical_test",
  "interview",
  "offer",
  "rejected",
  "ghosted",
]);

export const jobSource = pgEnum("job_source", [
  "linkedin",
  "glints",
  "kalibrr",
  "jobstreet",
  "referral",
  "other",
]);

export const workType = pgEnum("work_type", ["onsite", "hybrid", "remote"]);

export const documentType = pgEnum("document_type", ["cv", "cover_letter"]);

export const interviewStage = pgEnum("interview_stage", [
  "hr",
  "technical",
  "user",
  "final",
  "other",
]);

export const contactRole = pgEnum("contact_role", [
  "recruiter",
  "referral",
  "hiring_manager",
  "other",
]);
