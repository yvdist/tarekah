import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { generateText } from "ai";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { aiCredentials } from "@/db/schema";
import type { AiProvider } from "@/db/schema/enum-values";
import { createTestDb, createUser, type TestDb } from "@/test/db";
import { AiConfigError, encryptKey } from "./crypto";
import { saveCredential } from "./data";
import { getModelForUser } from "./model";

const secret = randomBytes(32);
const env = vi.hoisted(
  (): { AI_KEY_ENCRYPTION_KEY?: string; AI_FAKE_PROVIDER?: "1" } => ({}),
);

vi.mock("@/lib/env", () => ({ env }));

let db: TestDb;
let close: () => Promise<void>;
let userCount = 0;

beforeAll(async () => ({ db, close } = await createTestDb()));
afterAll(() => close());
beforeEach(() => {
  env.AI_KEY_ENCRYPTION_KEY = secret.toString("base64");
  env.AI_FAKE_PROVIDER = undefined;
});

const newUser = () => createUser(db, `model-${++userCount}`);

function save(userId: string, provider: AiProvider, model: string) {
  const key = `sk-${provider}-not-a-real-key-wxyz`;

  return saveCredential(db, userId, {
    provider,
    model,
    key: {
      ...encryptKey(key, secret, { userId, provider }),
      keyLast4: key.slice(-4),
    },
  });
}

describe("getModelForUser", () => {
  it("is null for a user without a key", async () => {
    expect(await getModelForUser(db, await newUser())).toBeNull();
  });

  it("is null for another user's key", async () => {
    const [mine, theirs] = [await newUser(), await newUser()];

    await save(theirs, "anthropic", "claude-sonnet-5-5");

    expect(await getModelForUser(db, mine)).toBeNull();
    expect(
      await getModelForUser(db, mine, { provider: "anthropic" }),
    ).toBeNull();
  });

  it.each([
    ["anthropic", "claude-sonnet-5-5"],
    ["openai", "gpt-6.1-sol"],
    ["google", "gemini-3.6-flash"],
  ] as const)(
    "builds the %s model the user chose",
    async (provider, modelId) => {
      const userId = await newUser();

      await save(userId, provider, modelId);

      const resolved = await getModelForUser(db, userId);

      expect(resolved).toMatchObject({ provider, modelId });
      expect(resolved?.model).toMatchObject({ modelId });
      // The key stays inside the provider instance.
      expect(JSON.stringify(resolved)).not.toContain("not-a-real-key");
    },
  );

  it("uses the active provider unless one is named", async () => {
    const userId = await newUser();

    await save(userId, "anthropic", "claude-sonnet-5-5");
    await save(userId, "openai", "gpt-6.1-sol");

    expect((await getModelForUser(db, userId))?.provider).toBe("openai");
    expect(
      (await getModelForUser(db, userId, { provider: "anthropic" }))?.provider,
    ).toBe("anthropic");
  });

  it("fails clearly when the server secret is missing", async () => {
    const userId = await newUser();

    await save(userId, "anthropic", "claude-sonnet-5-5");
    env.AI_KEY_ENCRYPTION_KEY = undefined;

    await expect(getModelForUser(db, userId)).rejects.toMatchObject({
      name: "AiConfigError",
      reason: "secret",
    });
  });

  it("fails when the stored key was tampered with or the secret changed", async () => {
    const userId = await newUser();

    await save(userId, "anthropic", "claude-sonnet-5-5");
    env.AI_KEY_ENCRYPTION_KEY = randomBytes(32).toString("base64");

    await expect(getModelForUser(db, userId)).rejects.toBeInstanceOf(
      AiConfigError,
    );

    env.AI_KEY_ENCRYPTION_KEY = secret.toString("base64");
    await db
      .update(aiCredentials)
      .set({ authTag: randomBytes(16).toString("base64") })
      .where(eq(aiCredentials.userId, userId));

    await expect(getModelForUser(db, userId)).rejects.toMatchObject({
      reason: "decrypt",
    });
  });

  it("returns the canned model when AI_FAKE_PROVIDER is set, still requiring a key", async () => {
    const userId = await newUser();

    env.AI_FAKE_PROVIDER = "1";

    expect(await getModelForUser(db, userId)).toBeNull();

    await save(userId, "anthropic", "claude-sonnet-5-5");

    const resolved = await getModelForUser(db, userId);

    if (!resolved) {
      expect.unreachable();
    }

    const { text } = await generateText({
      model: resolved.model,
      prompt: "hi",
    });

    expect(text).toBe("ok");
  });
});
