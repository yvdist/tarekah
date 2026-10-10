import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  AiConfigError,
  CURRENT_KEY_VERSION,
  decryptKey,
  encryptKey,
  parseEncryptionSecret,
} from "./crypto";

const secret = randomBytes(32);
const binding = { userId: "user-1", provider: "anthropic" } as const;
const KEY = "sk-ant-api03-not-a-real-key-0123456789";

// Flips the first byte of a base64 value.
function tamper(value: string) {
  const bytes = Buffer.from(value, "base64");

  bytes[0] ^= 1;

  return bytes.toString("base64");
}

describe("parseEncryptionSecret", () => {
  it("accepts 32 bytes in base64", () => {
    expect(parseEncryptionSecret(secret.toString("base64"))).toEqual(secret);
    expect(parseEncryptionSecret(` ${secret.toString("base64")}\n`)).toEqual(
      secret,
    );
  });

  it.each([undefined, "", "   "])("says how to create a missing one", (raw) => {
    expect(() => parseEncryptionSecret(raw)).toThrow(
      /AI_KEY_ENCRYPTION_KEY is not set.*openssl rand -base64 32/,
    );
  });

  it.each([
    ["too short", randomBytes(16).toString("base64")],
    ["too long", randomBytes(48).toString("base64")],
    ["hex, not base64", randomBytes(32).toString("hex")],
    ["not base64 at all", "not a secret!"],
  ])("rejects a secret that is %s", (_, raw) => {
    expect(() => parseEncryptionSecret(raw)).toThrow(
      /must be 32 bytes in base64/,
    );
  });

  it("marks the failure as a server problem", () => {
    try {
      parseEncryptionSecret(undefined);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(AiConfigError);
      expect((error as AiConfigError).reason).toBe("secret");
    }
  });
});

describe("encryptKey and decryptKey", () => {
  it("round-trips a key", () => {
    const stored = encryptKey(KEY, secret, binding);

    expect(stored.keyVersion).toBe(CURRENT_KEY_VERSION);
    expect(decryptKey(stored, secret, binding)).toBe(KEY);
  });

  it("does not store the key in the clear", () => {
    const stored = encryptKey(KEY, secret, binding);

    expect(JSON.stringify(stored)).not.toContain(KEY);
    expect(
      Buffer.from(stored.encryptedKey, "base64").toString("utf8"),
    ).not.toContain("sk-ant");
  });

  it("uses a fresh IV every time", () => {
    const first = encryptKey(KEY, secret, binding);
    const second = encryptKey(KEY, secret, binding);

    expect(first.iv).not.toBe(second.iv);
    expect(first.encryptedKey).not.toBe(second.encryptedKey);
  });

  it.each(["encryptedKey", "authTag", "iv"] as const)(
    "rejects a changed %s",
    (field) => {
      const stored = encryptKey(KEY, secret, binding);

      expect(() =>
        decryptKey(
          { ...stored, [field]: tamper(stored[field]) },
          secret,
          binding,
        ),
      ).toThrow(AiConfigError);
    },
  );

  it("rejects a row moved to another user or provider", () => {
    const stored = encryptKey(KEY, secret, binding);

    expect(() =>
      decryptKey(stored, secret, { ...binding, userId: "user-2" }),
    ).toThrow(AiConfigError);
    expect(() =>
      decryptKey(stored, secret, { ...binding, provider: "openai" }),
    ).toThrow(AiConfigError);
  });

  it("rejects another secret and an unknown key version", () => {
    const stored = encryptKey(KEY, secret, binding);

    expect(() => decryptKey(stored, randomBytes(32), binding)).toThrow(
      AiConfigError,
    );
    expect(() =>
      decryptKey({ ...stored, keyVersion: 2 }, secret, binding),
    ).toThrow(/key version 2/);
  });

  it("says nothing about the key when decryption fails", () => {
    const stored = encryptKey(KEY, secret, binding);

    try {
      decryptKey(
        { ...stored, authTag: tamper(stored.authTag) },
        secret,
        binding,
      );
      expect.unreachable();
    } catch (error) {
      expect((error as AiConfigError).reason).toBe("decrypt");
      expect((error as AiConfigError).cause).toBeUndefined();
      expect(String(error)).not.toContain(stored.encryptedKey);
    }
  });
});
