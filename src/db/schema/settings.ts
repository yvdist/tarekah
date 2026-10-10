import { sql } from "drizzle-orm";
import { check, integer, pgTable, text } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { createdAt, updatedAt } from "./columns";
import { aiProvider } from "./enums";

// One optional row per user. A user without a row gets the defaults, which
// are repeated in src/features/settings/constants.ts.
export const userSettings = pgTable(
  "user_settings",
  {
    userId: text()
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    followUpAfterDays: integer().notNull().default(7),
    ghostedAfterDays: integer().notNull().default(21),
    // Which of the user's saved keys practice feedback uses; null without one.
    activeAiProvider: aiProvider(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check(
      "user_settings_follow_up_after_days_check",
      sql`${t.followUpAfterDays} > 0`,
    ),
    check(
      "user_settings_ghosted_after_days_check",
      sql`${t.ghostedAfterDays} > 0`,
    ),
  ],
);
