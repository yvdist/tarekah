import { boolean, pgTable, text, unique } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt, userId } from "./columns";
import { documentType } from "./enums";

// A version of a CV or cover letter. The file itself lives elsewhere (url).
export const documents = pgTable(
  "documents",
  {
    id: id(),
    userId: userId(),
    type: documentType().notNull(),
    label: text().notNull(),
    url: text(),
    notes: text(),
    isArchived: boolean().notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("documents_user_id_type_label_unique").on(t.userId, t.type, t.label),
  ],
);
