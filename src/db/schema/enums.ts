import { pgEnum } from "drizzle-orm/pg-core";
import {
  APPLICATION_STATUSES,
  CONTACT_ROLES,
  DOCUMENT_TYPES,
  INTERVIEW_STAGES,
  JOB_SOURCES,
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
