import { index, pgTable, text } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt, userId } from "./columns";
import { competency } from "./enums";

// One experience in STAR form (situation, task, action, result). The four
// parts are markdown and may be empty while the story is still a draft.
export const stories = pgTable(
  "stories",
  {
    id: id(),
    userId: userId(),
    title: text().notNull(),
    situation: text(),
    task: text(),
    action: text(),
    result: text(),
    competencies: competency().array().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.userId)],
);
