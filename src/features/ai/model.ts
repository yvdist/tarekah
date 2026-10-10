import "server-only";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogle } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import type { AiProvider } from "@/db/schema/enum-values";
import type { Database } from "@/features/questions/data";
import { env } from "@/lib/env";
import { decryptKey, parseEncryptionSecret } from "./crypto";
import { findEncryptedCredential } from "./data";

export type ResolvedModel = {
  provider: AiProvider;
  modelId: string;
  model: LanguageModel;
};

const FACTORIES: Record<
  AiProvider,
  (apiKey: string, modelId: string) => LanguageModel
> = {
  anthropic: (apiKey, modelId) => createAnthropic({ apiKey })(modelId),
  openai: (apiKey, modelId) => createOpenAI({ apiKey })(modelId),
  google: (apiKey, modelId) => createGoogle({ apiKey })(modelId),
};

// The model a user's own key gives access to: the active provider's, or the
// named one's. Null when there is no such key. This is the only place a key is
// decrypted; it lives for the length of this call and is never returned.
//
// The database comes in as an argument (see data.ts) and the caller has already
// resolved userId from the session. Throws AiConfigError when the server secret
// is missing or the stored key does not open with it.
export async function getModelForUser(
  db: Database,
  userId: string,
  options: { provider?: AiProvider } = {},
): Promise<ResolvedModel | null> {
  const credential = await findEncryptedCredential(
    db,
    userId,
    options.provider,
  );

  if (!credential) {
    return null;
  }

  const { provider, model: modelId } = credential;
  const apiKey = decryptKey(
    credential,
    parseEncryptionSecret(env.AI_KEY_ENCRYPTION_KEY),
    { userId, provider },
  );

  if (env.AI_FAKE_PROVIDER) {
    const { createFakeModel } = await import("./fake-model");

    return { provider, modelId, model: createFakeModel(modelId) };
  }

  return { provider, modelId, model: FACTORIES[provider](apiKey, modelId) };
}
