import "server-only";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createGoogle } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel, TranscriptionModel } from "ai";
import type { AiProvider } from "@/db/schema/enum-values";
import type { Database } from "@/features/questions/data";
import { env } from "@/lib/env";
import { decryptKey, parseEncryptionSecret } from "./crypto";
import { findAiSummary, findEncryptedCredential } from "./data";
import {
  pickTranscriptionProvider,
  TRANSCRIPTION_MODELS,
  type TranscriptionProvider,
  withoutStorage,
} from "./transcription";

export type ResolvedModel = {
  provider: AiProvider;
  modelId: string;
  model: LanguageModel;
};

export type ResolvedTranscriptionModel = {
  provider: TranscriptionProvider;
  modelId: string;
  model: TranscriptionModel;
};

const FACTORIES: Record<
  AiProvider,
  (apiKey: string, modelId: string) => LanguageModel
> = {
  anthropic: (apiKey, modelId) => createAnthropic({ apiKey })(modelId),
  openai: (apiKey, modelId) => createOpenAI({ apiKey })(modelId),
  google: (apiKey, modelId) => createGoogle({ apiKey })(modelId),
  deepseek: (apiKey, modelId) => createDeepSeek({ apiKey })(modelId),
};

const TRANSCRIPTION_FACTORIES: Record<
  TranscriptionProvider,
  (apiKey: string, modelId: string) => TranscriptionModel
> = {
  google: (apiKey, modelId) =>
    createGoogle({ apiKey, fetch: withoutStorage }).transcription(modelId),
  openai: (apiKey, modelId) => createOpenAI({ apiKey }).transcription(modelId),
};

// One saved key, opened: the named provider's, or the active one's. This is
// the only place a key is decrypted; it lives for the length of the call that
// asked for it and is never returned from this file.
async function openCredential(
  db: Database,
  userId: string,
  wanted?: AiProvider,
) {
  const credential = await findEncryptedCredential(db, userId, wanted);

  if (!credential) {
    return null;
  }

  const { provider, model } = credential;
  const apiKey = decryptKey(
    credential,
    parseEncryptionSecret(env.AI_KEY_ENCRYPTION_KEY),
    { userId, provider },
  );

  return { provider, model, apiKey };
}

// The model a user's own key gives access to: the active provider's, or the
// named one's. Null when there is no such key.
//
// The database comes in as an argument (see data.ts) and the caller has already
// resolved userId from the session. Throws AiConfigError when the server secret
// is missing or the stored key does not open with it.
export async function getModelForUser(
  db: Database,
  userId: string,
  options: { provider?: AiProvider } = {},
): Promise<ResolvedModel | null> {
  const credential = await openCredential(db, userId, options.provider);

  if (!credential) {
    return null;
  }

  const { provider, model: modelId, apiKey } = credential;

  if (env.AI_FAKE_PROVIDER) {
    const { createFakeModel } = await import("./fake-model");

    return { provider, modelId, model: createFakeModel(modelId) };
  }

  return { provider, modelId, model: FACTORIES[provider](apiKey, modelId) };
}

// The model that turns a recording into text, from whichever saved key can:
// not necessarily the active one, since two of the providers have no such
// model. The model id is the app's choice, not the one saved with the key.
// Null when no saved key can transcribe.
export async function getTranscriptionModelForUser(
  db: Database,
  userId: string,
): Promise<ResolvedTranscriptionModel | null> {
  const { activeProvider, credentials } = await findAiSummary(db, userId);
  const provider = pickTranscriptionProvider(
    activeProvider,
    credentials.map((credential) => credential.provider),
  );
  const credential = provider && (await openCredential(db, userId, provider));

  if (!provider || !credential) {
    return null;
  }

  const modelId = TRANSCRIPTION_MODELS[provider];

  if (env.AI_FAKE_PROVIDER) {
    const { createFakeTranscriptionModel } = await import("./fake-model");

    return { provider, modelId, model: createFakeTranscriptionModel(modelId) };
  }

  return {
    provider,
    modelId,
    model: TRANSCRIPTION_FACTORIES[provider](credential.apiKey, modelId),
  };
}
