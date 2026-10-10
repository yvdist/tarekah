import { integer, pgTable, text, unique } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt, userId } from "./columns";
import { aiProvider } from "./enums";

// A user's own API key for one provider, encrypted with AES-256-GCM. The three
// binary parts are base64. keyVersion names the server secret that encrypted
// the row, so that secret can be rotated later. keyLast4 is the only part of
// the key that is ever shown again.
export const aiCredentials = pgTable(
  "ai_credentials",
  {
    id: id(),
    userId: userId(),
    provider: aiProvider().notNull(),
    encryptedKey: text().notNull(),
    iv: text().notNull(),
    authTag: text().notNull(),
    keyVersion: integer().notNull().default(1),
    keyLast4: text().notNull(),
    model: text().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("ai_credentials_user_id_provider_unique").on(t.userId, t.provider),
  ],
);
