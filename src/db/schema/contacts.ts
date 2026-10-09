import { index, pgTable, primaryKey, text, uuid } from "drizzle-orm/pg-core";
import { applications } from "./applications";
import { createdAt, id, updatedAt, userId } from "./columns";
import { companies } from "./companies";
import { contactRole } from "./enums";

export const contacts = pgTable(
  "contacts",
  {
    id: id(),
    userId: userId(),
    companyId: uuid().references(() => companies.id, { onDelete: "set null" }),
    name: text().notNull(),
    role: contactRole().notNull(),
    title: text(),
    email: text(),
    phone: text(),
    linkedinUrl: text(),
    notes: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.userId, t.companyId)],
);

export const applicationContacts = pgTable(
  "application_contacts",
  {
    applicationId: uuid()
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    contactId: uuid()
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    userId: userId(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.applicationId, t.contactId] }),
    index().on(t.contactId),
  ],
);
