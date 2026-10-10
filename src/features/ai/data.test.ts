import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { aiCredentials, userSettings } from "@/db/schema";
import type { AiProvider } from "@/db/schema/enum-values";
import { createTestDb, createUser, type TestDb } from "@/test/db";
import { encryptKey } from "./crypto";
import {
  deleteCredential,
  findActiveProvider,
  findAiSummary,
  findEncryptedCredential,
  saveCredential,
  setActiveProvider,
} from "./data";

let db: TestDb;
let close: () => Promise<void>;
let userCount = 0;

beforeAll(async () => ({ db, close } = await createTestDb()));
afterAll(() => close());

const secret = randomBytes(32);
const newUser = () => createUser(db, `ai-${++userCount}`);
const rawKey = (provider: AiProvider) => `sk-${provider}-not-a-real-key-wxyz`;

function save(userId: string, provider: AiProvider, model = "model-a") {
  const key = rawKey(provider);

  return saveCredential(db, userId, {
    provider,
    model,
    key: {
      ...encryptKey(key, secret, { userId, provider }),
      keyLast4: key.slice(-4),
    },
  });
}

describe("findAiSummary", () => {
  it("is empty for a user without keys", async () => {
    expect(await findAiSummary(db, await newUser())).toEqual({
      activeProvider: null,
      credentials: [],
    });
  });

  it("returns the provider, model and last four characters, and nothing of the key", async () => {
    const userId = await newUser();

    await save(userId, "anthropic", "claude-sonnet-5-5");

    const summary = await findAiSummary(db, userId);
    const [stored] = await db
      .select()
      .from(aiCredentials)
      .where(eq(aiCredentials.userId, userId));

    expect(summary.activeProvider).toBe("anthropic");
    expect(summary.credentials).toHaveLength(1);
    expect(Object.keys(summary.credentials[0]).sort()).toEqual([
      "keyLast4",
      "model",
      "provider",
      "updatedAt",
    ]);
    expect(summary.credentials[0]).toMatchObject({
      provider: "anthropic",
      model: "claude-sonnet-5-5",
      keyLast4: "wxyz",
    });

    const serialized = JSON.stringify(summary);

    expect(serialized).not.toContain(rawKey("anthropic"));
    expect(serialized).not.toContain(stored.encryptedKey);
    expect(serialized).not.toContain(stored.iv);
    expect(serialized).not.toContain(stored.authTag);
  });

  it("never shows another user's keys", async () => {
    const [mine, theirs] = [await newUser(), await newUser()];

    await save(theirs, "openai");

    expect(await findAiSummary(db, mine)).toEqual({
      activeProvider: null,
      credentials: [],
    });
    expect(await findEncryptedCredential(db, mine, "openai")).toBeNull();
  });
});

describe("saveCredential", () => {
  it("keeps one key per provider and makes the saved one active", async () => {
    const userId = await newUser();

    await save(userId, "anthropic", "model-a");
    await save(userId, "openai", "model-b");
    await save(userId, "anthropic", "model-c");

    const summary = await findAiSummary(db, userId);

    expect(summary.activeProvider).toBe("anthropic");
    expect(
      summary.credentials.map(({ provider, model }) => [provider, model]),
    ).toEqual([
      ["anthropic", "model-c"],
      ["openai", "model-b"],
    ]);
  });

  it("changes only the model when no key is given", async () => {
    const userId = await newUser();

    await save(userId, "google", "model-a");

    const before = await findEncryptedCredential(db, userId, "google");

    expect(
      await saveCredential(db, userId, {
        provider: "google",
        model: "model-b",
      }),
    ).toBe(true);

    const after = await findEncryptedCredential(db, userId, "google");

    expect(after).toEqual({ ...before, model: "model-b" });
  });

  it("refuses a model change for a provider without a key", async () => {
    const userId = await newUser();

    expect(
      await saveCredential(db, userId, {
        provider: "google",
        model: "model-b",
      }),
    ).toBe(false);
    expect(await findActiveProvider(db, userId)).toBeNull();
  });

  it("leaves the follow-up settings alone", async () => {
    const userId = await newUser();

    await db
      .insert(userSettings)
      .values({ userId, followUpAfterDays: 3, ghostedAfterDays: 9 });
    await save(userId, "openai");

    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId));

    expect(settings).toMatchObject({
      followUpAfterDays: 3,
      ghostedAfterDays: 9,
      activeAiProvider: "openai",
    });
  });
});

describe("findEncryptedCredential", () => {
  it("returns the active provider's key by default", async () => {
    const userId = await newUser();

    await save(userId, "anthropic");
    await save(userId, "openai");

    expect((await findEncryptedCredential(db, userId))?.provider).toBe(
      "openai",
    );
    expect(
      (await findEncryptedCredential(db, userId, "anthropic"))?.provider,
    ).toBe("anthropic");
    expect(await findEncryptedCredential(db, userId, "google")).toBeNull();
  });
});

describe("setActiveProvider", () => {
  it("switches between saved keys only", async () => {
    const userId = await newUser();

    await save(userId, "anthropic");
    await save(userId, "openai");

    expect(await setActiveProvider(db, userId, "anthropic")).toBe(true);
    expect(await findActiveProvider(db, userId)).toBe("anthropic");
    expect(await setActiveProvider(db, userId, "google")).toBe(false);
    expect(await findActiveProvider(db, userId)).toBe("anthropic");
  });
});

describe("deleteCredential", () => {
  it("hands the active role to another key, then to nothing", async () => {
    const userId = await newUser();

    await save(userId, "google");
    await save(userId, "openai");

    expect(await deleteCredential(db, userId, "openai")).toBe(true);
    expect(await findActiveProvider(db, userId)).toBe("google");
    expect(await deleteCredential(db, userId, "google")).toBe(true);
    expect(await findAiSummary(db, userId)).toEqual({
      activeProvider: null,
      credentials: [],
    });
  });

  it("keeps the active provider when another key is deleted", async () => {
    const userId = await newUser();

    await save(userId, "anthropic");
    await save(userId, "openai");
    await deleteCredential(db, userId, "anthropic");

    expect(await findActiveProvider(db, userId)).toBe("openai");
  });

  it("does not touch another user's key", async () => {
    const [mine, theirs] = [await newUser(), await newUser()];

    await save(theirs, "anthropic");

    expect(await deleteCredential(db, mine, "anthropic")).toBe(false);
    expect((await findAiSummary(db, theirs)).credentials).toHaveLength(1);
  });
});
