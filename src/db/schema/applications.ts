import { sql } from "drizzle-orm";
import {
  char,
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt, userId } from "./columns";
import { companies } from "./companies";
import { documents } from "./documents";
import { applicationStatus, jobSource, workType } from "./enums";

export const applications = pgTable(
  "applications",
  {
    id: id(),
    userId: userId(),
    companyId: uuid()
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    position: text().notNull(),
    jobUrl: text(),
    source: jobSource().notNull(),
    sourceDetail: text(),
    salaryMin: integer(),
    salaryMax: integer(),
    salaryCurrency: char({ length: 3 }).notNull().default("IDR"),
    location: text(),
    workType: workType(),
    appliedAt: date(),
    // Copy of the latest status event, kept here for fast filtering.
    status: applicationStatus().notNull().default("wishlist"),
    statusChangedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    followUpSnoozedUntil: date(),
    // Set by the "Sudah follow-up" action; restarts the follow-up count.
    lastFollowedUpAt: timestamp({ withTimezone: true }),
    cvDocumentId: uuid().references(() => documents.id, {
      onDelete: "set null",
    }),
    coverLetterDocumentId: uuid().references(() => documents.id, {
      onDelete: "set null",
    }),
    notes: text(),
    jobDescription: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index().on(t.userId, t.status),
    index().on(t.userId, t.statusChangedAt),
    index().on(t.userId, t.appliedAt),
    index().on(t.userId, t.source),
    index().on(t.companyId),
    check("applications_salary_min_check", sql`${t.salaryMin} >= 0`),
    check(
      "applications_salary_range_check",
      sql`${t.salaryMin} <= ${t.salaryMax}`,
    ),
  ],
);

// Append-only status history. Written in the same transaction as the
// status change on applications.
export const applicationStatusEvents = pgTable(
  "application_status_events",
  {
    id: id(),
    userId: userId(),
    applicationId: uuid()
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    fromStatus: applicationStatus(),
    toStatus: applicationStatus().notNull(),
    changedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    note: text(),
    createdAt: createdAt(),
  },
  (t) => [
    index().on(t.applicationId, t.changedAt),
    index().on(t.userId, t.toStatus),
  ],
);
