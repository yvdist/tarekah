import {
  APICallError,
  NoObjectGeneratedError,
  NoOutputGeneratedError,
  RetryError,
} from "ai";
import type { AiProvider } from "@/db/schema/enum-values";
import { AiConfigError } from "./crypto";

export const AI_ERROR_CODES = [
  "not_configured",
  "server_not_ready",
  "unreadable_key",
  "invalid_key",
  "quota",
  "rate_limit",
  "timeout",
  "unavailable",
  "model_not_found",
  "bad_output",
  "unknown",
] as const;

export type AiErrorCode = (typeof AI_ERROR_CODES)[number];

// What the user reads. None of these blames them, and none repeats anything
// the provider said: its message can quote the key or the prompt.
export const AI_ERROR_MESSAGES: Record<AiErrorCode, string> = {
  not_configured: "Belum ada key AI yang aktif. Atur dulu di Pengaturan.",
  server_not_ready: "Fitur AI belum diaktifkan di server ini.",
  unreadable_key:
    "Key yang tersimpan tidak bisa dibuka lagi. Simpan ulang key-mu di Pengaturan.",
  invalid_key:
    "Key-nya belum bisa dipakai. Coba periksa lagi di pengaturan provider-mu.",
  quota:
    "Kuota atau saldo di provider-mu sepertinya habis. Cek tagihannya di sana, lalu coba lagi.",
  rate_limit:
    "Provider sedang membatasi permintaan. Tunggu sebentar, lalu coba lagi.",
  timeout: "Provider terlalu lama menjawab. Coba lagi sebentar lagi.",
  unavailable: "Provider sedang gangguan. Coba lagi beberapa saat lagi.",
  model_not_found:
    "Model itu tidak dikenali provider. Periksa ID model di Pengaturan.",
  bad_output: "Jawaban dari model tidak terbaca kali ini. Coba lagi.",
  unknown: "Ada yang tidak beres saat menghubungi provider. Coba lagi.",
};

const INVALID_KEY = new Set([
  "authentication_error",
  "permission_error",
  "invalid_api_key",
  "api_key_invalid",
  "unauthenticated",
  "permission_denied",
]);

const QUOTA = new Set([
  "billing_error",
  "insufficient_quota",
  "credit_balance_exhausted",
  "billing_not_active",
]);

const NOT_FOUND = new Set(["not_found_error", "model_not_found", "not_found"]);

const OVERLOADED = new Set([
  "overloaded_error",
  "server_is_overloaded",
  "unavailable",
]);

// The machine-readable words of a provider's error body, lowercased. The three
// providers nest them differently: Anthropic { error: { type } }, OpenAI
// { error: { type, code } }, Google { error: { status, details: [{ reason }] } }.
function errorWords(data: unknown): string[] {
  const error = isRecord(data) ? data.error : undefined;

  if (!isRecord(error)) {
    return [];
  }

  const details = Array.isArray(error.details) ? error.details : [];

  return [
    error.type,
    error.code,
    error.status,
    ...details.map((detail) => (isRecord(detail) ? detail.reason : undefined)),
  ]
    .filter((word) => typeof word === "string")
    .map((word) => word.toLowerCase());
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

function classifyApiCall(error: APICallError): AiErrorCode {
  const status = error.statusCode;
  const words = errorWords(error.data);
  const has = (set: Set<string>) => words.some((word) => set.has(word));

  // Checked before the status: OpenAI reports an empty balance as 429, the
  // status of a rate limit, and Google reports a bad key as 400.
  if (
    status === 402 ||
    has(QUOTA) ||
    words.some((word) => word.endsWith("spend_limit_exceeded"))
  ) {
    return "quota";
  }

  if (status === 401 || status === 403 || has(INVALID_KEY)) {
    return "invalid_key";
  }

  if (status === 404 || has(NOT_FOUND)) {
    return "model_not_found";
  }

  if (status === 429) {
    return "rate_limit";
  }

  if (status === 408 || status === 504) {
    return "timeout";
  }

  // No status at all means the request never got an answer.
  if (status === undefined || status >= 500 || has(OVERLOADED)) {
    return "unavailable";
  }

  return "unknown";
}

export function classifyAiError(error: unknown): AiErrorCode {
  // Retries exhausted: the last attempt says why.
  if (RetryError.isInstance(error)) {
    return classifyAiError(error.lastError);
  }

  if (error instanceof AiConfigError) {
    return error.reason === "secret" ? "server_not_ready" : "unreadable_key";
  }

  if (APICallError.isInstance(error)) {
    return classifyApiCall(error);
  }

  if (
    NoObjectGeneratedError.isInstance(error) ||
    NoOutputGeneratedError.isInstance(error)
  ) {
    return "bad_output";
  }

  if (error instanceof Error) {
    // AbortSignal.timeout() rejects with a TimeoutError.
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      return "timeout";
    }

    // fetch() itself failing: DNS, connection reset.
    if (error.name === "TypeError") {
      return "unavailable";
    }
  }

  return "unknown";
}

// Turns a failed AI call into what the user reads, and leaves one line in the
// server log. The error itself is never logged: it carries the request body
// (the user's answer) and a provider message that can quote the key.
export function reportAiError(
  error: unknown,
  context: { where: string; provider?: AiProvider },
): { code: AiErrorCode; message: string } {
  const code = classifyAiError(error);
  const last = RetryError.isInstance(error) ? error.lastError : error;

  console.error("[ai]", {
    where: context.where,
    code,
    provider: context.provider,
    status: APICallError.isInstance(last) ? last.statusCode : undefined,
  });

  return { code, message: AI_ERROR_MESSAGES[code] };
}
