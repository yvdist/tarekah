import { text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth";

export const id = () => uuid().primaryKey().defaultRandom();

// Every domain table carries the owner, so every query can filter on it.
export const userId = () =>
  text()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" });

export const createdAt = () =>
  timestamp({ withTimezone: true }).notNull().defaultNow();

export const updatedAt = () =>
  timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
