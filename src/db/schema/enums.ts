import { pgEnum } from "drizzle-orm/pg-core";
import {
  AI_PROVIDERS,
  APPLICATION_STATUSES,
  COMPETENCIES,
  CONTACT_ROLES,
  DOCUMENT_TYPES,
  INTERVIEW_STAGES,
  JOB_SOURCES,
  PRACTICE_INTERVIEW_TYPES,
  PRACTICE_LANGUAGES,
  PRACTICE_LEVELS,
  PRACTICE_MODES,
  PRACTICE_SESSION_STATUSES,
  PRACTICE_TONES,
  PRACTICE_TURN_ROLES,
  QUESTION_CATEGORIES,
  QUESTION_READINESS,
  QUESTION_SOURCES,
  WORK_TYPES,
} from "./enum-values";

export const applicationStatus = pgEnum(
  "application_status",
  APPLICATION_STATUSES,
);

export const jobSource = pgEnum("job_source", JOB_SOURCES);

export const workType = pgEnum("work_type", WORK_TYPES);

export const documentType = pgEnum("document_type", DOCUMENT_TYPES);

export const interviewStage = pgEnum("interview_stage", INTERVIEW_STAGES);

export const contactRole = pgEnum("contact_role", CONTACT_ROLES);

export const competency = pgEnum("competency", COMPETENCIES);

export const questionCategory = pgEnum(
  "question_category",
  QUESTION_CATEGORIES,
);

export const questionSource = pgEnum("question_source", QUESTION_SOURCES);

export const questionReadiness = pgEnum(
  "question_readiness",
  QUESTION_READINESS,
);

export const aiProvider = pgEnum("ai_provider", AI_PROVIDERS);

export const practiceMode = pgEnum("practice_mode", PRACTICE_MODES);

export const practiceInterviewType = pgEnum(
  "practice_interview_type",
  PRACTICE_INTERVIEW_TYPES,
);

export const practiceLevel = pgEnum("practice_level", PRACTICE_LEVELS);

export const practiceLanguage = pgEnum("practice_language", PRACTICE_LANGUAGES);

export const practiceTone = pgEnum("practice_tone", PRACTICE_TONES);

export const practiceSessionStatus = pgEnum(
  "practice_session_status",
  PRACTICE_SESSION_STATUSES,
);

export const practiceTurnRole = pgEnum(
  "practice_turn_role",
  PRACTICE_TURN_ROLES,
);
