import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { generateText, transcribe } from "ai";
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
import { FAKE_TRANSCRIPT } from "./fake-model";
import { getModelForUser, getTranscriptionModelForUser } from "./model";

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
    ["deepseek", "deepseek-flash"],
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

describe("getTranscriptionModelForUser", () => {
  it("is null without a key that can transcribe", async () => {
    const userId = await newUser();

    expect(await getTranscriptionModelForUser(db, userId)).toBeNull();

    await save(userId, "anthropic", "claude-sonnet-5-5");
    await save(userId, "deepseek", "deepseek-flash");

    expect(await getTranscriptionModelForUser(db, userId)).toBeNull();
  });

  it("uses a saved key that can, whichever provider is active", async () => {
    const userId = await newUser();

    await save(userId, "google", "gemini-3.6-flash");
    await save(userId, "deepseek", "deepseek-flash");

    expect((await getModelForUser(db, userId))?.provider).toBe("deepseek");

    const resolved = await getTranscriptionModelForUser(db, userId);

    // The app's transcription model, not the one saved for answers.
    expect(resolved).toMatchObject({
      provider: "google",
      modelId: "gemini-3.5-transcribe",
    });
    expect(JSON.stringify(resolved)).not.toContain("not-a-real-key");
  });

  it("uses the active provider when it can transcribe", async () => {
    const userId = await newUser();

    await save(userId, "google", "gemini-3.6-flash");
    await save(userId, "openai", "gpt-6.1-sol");

    expect(await getTranscriptionModelForUser(db, userId)).toMatchObject({
      provider: "openai",
      modelId: "gpt-transcribe",
    });
  });

  it("is null for another user's key", async () => {
    const owner = await newUser();
    const other = await newUser();

    await save(owner, "google", "gemini-3.6-flash");

    expect(await getTranscriptionModelForUser(db, other)).toBeNull();
  });

  it("fails clearly when the server secret is missing", async () => {
    const userId = await newUser();

    await save(userId, "google", "gemini-3.6-flash");
    env.AI_KEY_ENCRYPTION_KEY = undefined;

    await expect(
      getTranscriptionModelForUser(db, userId),
    ).rejects.toMatchObject({ name: "AiConfigError", reason: "secret" });
  });

  it("returns the canned model when AI_FAKE_PROVIDER is set, still requiring a key", async () => {
    const userId = await newUser();

    env.AI_FAKE_PROVIDER = "1";

    expect(await getTranscriptionModelForUser(db, userId)).toBeNull();

    await save(userId, "openai", "gpt-6.1-sol");

    const resolved = await getTranscriptionModelForUser(db, userId);

    if (!resolved) {
      expect.unreachable();
    }

    const { text } = await transcribe({
      model: resolved.model,
      audio: new Uint8Array([0x4f, 0x67, 0x67, 0x53]),
    });

    expect(text).toBe(FAKE_TRANSCRIPT);
  });
});
