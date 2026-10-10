import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { AiProvider } from "@/db/schema/enum-values";

// Encryption of the users' API keys: AES-256-GCM under one server secret.
// Nothing here reads the environment or the database, so it is tested as is.

// Names the server secret a row was encrypted with. Rotating the secret means
// adding a version and re-encrypting the rows of the old one.
export const CURRENT_KEY_VERSION = 1;

const SECRET_BYTES = 32;
const IV_BYTES = 12;
const HOW_TO_GENERATE = "Generate one with: openssl rand -base64 32";

// "secret": the server has no usable AI_KEY_ENCRYPTION_KEY.
// "decrypt": a stored key could not be opened with it.
export class AiConfigError extends Error {
  readonly reason: "secret" | "decrypt";

  constructor(reason: "secret" | "decrypt", message: string) {
    super(message);
    this.name = "AiConfigError";
    this.reason = reason;
  }
}

export type EncryptedKey = {
  encryptedKey: string;
  iv: string;
  authTag: string;
  keyVersion: number;
};

// What a ciphertext is bound to. It goes in as additional authenticated data,
// so a row copied onto another user or provider fails to decrypt.
export type KeyBinding = { userId: string; provider: AiProvider };

export function parseEncryptionSecret(raw: string | undefined): Buffer {
  const value = raw?.trim();

  if (!value) {
    throw new AiConfigError(
      "secret",
      `AI_KEY_ENCRYPTION_KEY is not set. ${HOW_TO_GENERATE}`,
    );
  }

  const secret = /^[A-Za-z0-9+/]+={0,2}$/.test(value)
    ? Buffer.from(value, "base64")
    : Buffer.alloc(0);

  if (secret.length !== SECRET_BYTES) {
    throw new AiConfigError(
      "secret",
      `AI_KEY_ENCRYPTION_KEY must be ${SECRET_BYTES} bytes in base64. ${HOW_TO_GENERATE}`,
    );
  }

  return secret;
}

const aad = (binding: KeyBinding, keyVersion: number) =>
  Buffer.from(`${binding.userId}:${binding.provider}:v${keyVersion}`);

export function encryptKey(
  plainKey: string,
  secret: Buffer,
  binding: KeyBinding,
): EncryptedKey {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", secret, iv);

  cipher.setAAD(aad(binding, CURRENT_KEY_VERSION));

  const encrypted = Buffer.concat([
    cipher.update(plainKey, "utf8"),
    cipher.final(),
  ]);

  return {
    encryptedKey: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    keyVersion: CURRENT_KEY_VERSION,
  };
}

// Called from model.ts only, so that is the one place a key exists in the
// clear.
export function decryptKey(
  stored: EncryptedKey,
  secret: Buffer,
  binding: KeyBinding,
): string {
  if (stored.keyVersion !== CURRENT_KEY_VERSION) {
    throw new AiConfigError(
      "decrypt",
      `No secret for key version ${stored.keyVersion}.`,
    );
  }

  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      secret,
      Buffer.from(stored.iv, "base64"),
    );

    decipher.setAAD(aad(binding, stored.keyVersion));
    decipher.setAuthTag(Buffer.from(stored.authTag, "base64"));

    return Buffer.concat([
      decipher.update(Buffer.from(stored.encryptedKey, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    // The cause is left out on purpose: nothing about the key or the
    // ciphertext should travel with the error.
    throw new AiConfigError("decrypt", "A stored API key failed to decrypt.");
  }
}
