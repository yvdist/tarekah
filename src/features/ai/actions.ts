"use server";

import { generateText } from "ai";
import { updateTag } from "next/cache";
import { db } from "@/db";
import { type ActionResult, invalidResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { encryptKey, parseEncryptionSecret } from "./crypto";
import { deleteCredential, saveCredential, setActiveProvider } from "./data";
import { AI_ERROR_MESSAGES, reportAiError } from "./errors";
import { getModelForUser } from "./model";
import { AI_PROVIDER_OPTIONS } from "./provider-options";
import { aiCredentialFormSchema, aiProviderSchema } from "./schemas";

const TEST_TIMEOUT_MS = 15_000;

// Saves a key for one provider and makes it the active one. With the key left
// empty it changes the model of the key already saved.
export async function saveAiCredential(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = aiCredentialFormSchema.safeParse(input);

  if (!parsed.success) {
    return invalidResult(parsed.error);
  }

  const { provider, apiKey, model } = parsed.data;
  let key;

  if (apiKey !== "") {
    try {
      key = {
        ...encryptKey(
          apiKey,
          parseEncryptionSecret(env.AI_KEY_ENCRYPTION_KEY),
          {
            userId: user.id,
            provider,
          },
        ),
        keyLast4: apiKey.slice(-4),
      };
    } catch (error) {
      return {
        ok: false,
        ...reportAiError(error, { where: "save", provider }),
      };
    }
  }

  const saved = await saveCredential(db, user.id, { provider, model, key });

  if (!saved) {
    return {
      ok: false,
      message: "Periksa kembali isian form.",
      fieldErrors: { apiKey: ["Isi key untuk provider ini"] },
    };
  }

  updateTag(`ai:${user.id}`);

  return { ok: true, data: undefined };
}

export async function setActiveAiProvider(
  provider: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = aiProviderSchema.safeParse(provider);

  if (!parsed.success) {
    return { ok: false, message: "Provider tidak valid." };
  }

  if (!(await setActiveProvider(db, user.id, parsed.data))) {
    return { ok: false, message: "Belum ada key untuk provider itu." };
  }

  updateTag(`ai:${user.id}`);

  return { ok: true, data: undefined };
}

// One minimal call with the saved key and model: it passes only when the key
// is accepted, the model exists and the account can pay for it.
export async function testAiCredential(
  provider: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = aiProviderSchema.safeParse(provider);

  if (!parsed.success) {
    return { ok: false, message: "Provider tidak valid." };
  }

  try {
    const resolved = await getModelForUser(db, user.id, {
      provider: parsed.data,
    });

    if (!resolved) {
      return { ok: false, message: AI_ERROR_MESSAGES.not_configured };
    }

    await generateText({
      model: resolved.model,
      prompt: "Reply with the single word: ok",
      providerOptions: AI_PROVIDER_OPTIONS,
      maxOutputTokens: 16,
      maxRetries: 0,
      timeout: TEST_TIMEOUT_MS,
    });
  } catch (error) {
    return {
      ok: false,
      ...reportAiError(error, { where: "test", provider: parsed.data }),
    };
  }

  return { ok: true, data: undefined };
}

export async function deleteAiCredential(
  provider: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = aiProviderSchema.safeParse(provider);

  if (!parsed.success) {
    return { ok: false, message: "Provider tidak valid." };
  }

  if (!(await deleteCredential(db, user.id, parsed.data))) {
    return { ok: false, message: "Key tidak ditemukan." };
  }

  updateTag(`ai:${user.id}`);

  return { ok: true, data: undefined };
}
