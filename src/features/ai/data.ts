import { and, asc, eq } from "drizzle-orm";
import { aiCredentials, userSettings } from "@/db/schema";
import type { AiProvider } from "@/db/schema/enum-values";
import type { Database } from "@/features/questions/data";
import type { EncryptedKey } from "./crypto";

// The SQL of the users' AI keys. The database is passed in rather than
// imported, so the same statements run against the pool and against an
// in-memory Postgres in tests. Callers own authorization and caching.

export type AiSummary = Awaited<ReturnType<typeof findAiSummary>>;

// What the settings page may know about the saved keys: never the key, never
// its ciphertext.
export async function findAiSummary(db: Database, userId: string) {
  const [credentials, activeProvider] = await Promise.all([
    db
      .select({
        provider: aiCredentials.provider,
        model: aiCredentials.model,
        keyLast4: aiCredentials.keyLast4,
        updatedAt: aiCredentials.updatedAt,
      })
      .from(aiCredentials)
      .where(eq(aiCredentials.userId, userId))
      .orderBy(asc(aiCredentials.provider)),
    findActiveProvider(db, userId),
  ]);

  return { activeProvider, credentials };
}

export async function findActiveProvider(db: Database, userId: string) {
  const [settings] = await db
    .select({ activeAiProvider: userSettings.activeAiProvider })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  return settings?.activeAiProvider ?? null;
}

// The ciphertext of one key: the named provider's, or the active one's. Only
// model.ts calls this.
export async function findEncryptedCredential(
  db: Database,
  userId: string,
  provider?: AiProvider,
) {
  const wanted = provider ?? (await findActiveProvider(db, userId));

  if (!wanted) {
    return null;
  }

  const [credential] = await db
    .select({
      provider: aiCredentials.provider,
      model: aiCredentials.model,
      encryptedKey: aiCredentials.encryptedKey,
      iv: aiCredentials.iv,
      authTag: aiCredentials.authTag,
      keyVersion: aiCredentials.keyVersion,
    })
    .from(aiCredentials)
    .where(
      and(eq(aiCredentials.userId, userId), eq(aiCredentials.provider, wanted)),
    )
    .limit(1);

  return credential ?? null;
}

type CredentialInput = {
  provider: AiProvider;
  model: string;
  // Absent when only the model of an already saved key changes.
  key?: EncryptedKey & { keyLast4: string };
};

// Saves a key (or a new model for a saved key) and makes that provider the
// active one. Returns false when there was no key to change the model of.
export async function saveCredential(
  db: Database,
  userId: string,
  { provider, model, key }: CredentialInput,
) {
  return db.transaction(async (tx) => {
    if (key) {
      await tx
        .insert(aiCredentials)
        .values({ userId, provider, model, ...key })
        .onConflictDoUpdate({
          target: [aiCredentials.userId, aiCredentials.provider],
          set: { model, ...key },
        });
    } else {
      const updated = await tx
        .update(aiCredentials)
        .set({ model })
        .where(
          and(
            eq(aiCredentials.userId, userId),
            eq(aiCredentials.provider, provider),
          ),
        )
        .returning({ id: aiCredentials.id });

      if (updated.length === 0) {
        return false;
      }
    }

    await writeActiveProvider(tx, userId, provider);

    return true;
  });
}

// Returns false when the user has no key for that provider.
export async function setActiveProvider(
  db: Database,
  userId: string,
  provider: AiProvider,
) {
  const [credential] = await db
    .select({ id: aiCredentials.id })
    .from(aiCredentials)
    .where(
      and(
        eq(aiCredentials.userId, userId),
        eq(aiCredentials.provider, provider),
      ),
    )
    .limit(1);

  if (!credential) {
    return false;
  }

  await writeActiveProvider(db, userId, provider);

  return true;
}

// Deletes a key. When it was the active one, another saved key takes over, or
// nothing does.
export async function deleteCredential(
  db: Database,
  userId: string,
  provider: AiProvider,
) {
  return db.transaction(async (tx) => {
    const deleted = await tx
      .delete(aiCredentials)
      .where(
        and(
          eq(aiCredentials.userId, userId),
          eq(aiCredentials.provider, provider),
        ),
      )
      .returning({ id: aiCredentials.id });

    if (deleted.length === 0) {
      return false;
    }

    if ((await findActiveProvider(tx, userId)) === provider) {
      const [next] = await tx
        .select({ provider: aiCredentials.provider })
        .from(aiCredentials)
        .where(eq(aiCredentials.userId, userId))
        .orderBy(asc(aiCredentials.provider))
        .limit(1);

      await writeActiveProvider(tx, userId, next?.provider ?? null);
    }

    return true;
  });
}

// user_settings is one optional row per user, so this is an upsert.
async function writeActiveProvider(
  db: Database,
  userId: string,
  activeAiProvider: AiProvider | null,
) {
  await db
    .insert(userSettings)
    .values({ userId, activeAiProvider })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { activeAiProvider },
    });
}
