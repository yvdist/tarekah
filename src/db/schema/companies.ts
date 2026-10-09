import { sql } from "drizzle-orm";
import { pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt, userId } from "./columns";

export const companies = pgTable(
  "companies",
  {
    id: id(),
    userId: userId(),
    name: text().notNull(),
    website: text(),
    notes: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("companies_user_id_name_unique").on(
      t.userId,
      sql`lower(${t.name})`,
    ),
  ],
);
