import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { applications } from "./applications";
import { createdAt, id, updatedAt, userId } from "./columns";
import { interviewStage } from "./enums";

export const interviews = pgTable(
  "interviews",
  {
    id: id(),
    userId: userId(),
    applicationId: uuid()
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    scheduledAt: timestamp({ withTimezone: true }).notNull(),
    stage: interviewStage().notNull(),
    interviewers: text(),
    questions: text(),
    reflection: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index().on(t.applicationId, t.scheduledAt),
    index().on(t.userId, t.scheduledAt),
  ],
);
