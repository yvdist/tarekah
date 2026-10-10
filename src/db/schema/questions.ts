import { index, pgTable, primaryKey, text, uuid } from "drizzle-orm/pg-core";
import { applications } from "./applications";
import { createdAt, id, updatedAt, userId } from "./columns";
import { questionCategory, questionReadiness, questionSource } from "./enums";
import { interviews } from "./interviews";
import { stories } from "./stories";

// The question bank. Questions from an interview keep a link to it, but they
// outlive the interview and the application: the links are set to null on
// delete, like a contact outlives the applications it was linked to.
export const questions = pgTable(
  "questions",
  {
    id: id(),
    userId: userId(),
    text: text().notNull(),
    category: questionCategory().notNull().default("other"),
    source: questionSource().notNull(),
    readiness: questionReadiness().notNull().default("not_ready"),
    interviewId: uuid().references(() => interviews.id, {
      onDelete: "set null",
    }),
    applicationId: uuid().references(() => applications.id, {
      onDelete: "set null",
    }),
    notes: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index().on(t.userId, t.category),
    index().on(t.userId, t.readiness),
    index().on(t.interviewId),
    index().on(t.applicationId),
  ],
);

export const questionStories = pgTable(
  "question_stories",
  {
    questionId: uuid()
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    storyId: uuid()
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    userId: userId(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.questionId, t.storyId] }),
    index().on(t.storyId),
  ],
);
