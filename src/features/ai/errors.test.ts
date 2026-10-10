import { APICallError, NoObjectGeneratedError, RetryError } from "ai";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AiConfigError } from "./crypto";
import {
  AI_ERROR_CODES,
  AI_ERROR_MESSAGES,
  classifyAiError,
  reportAiError,
} from "./errors";

const SECRET_KEY = "sk-live-do-not-log-me";
const ANSWER = "jawaban pengguna yang tidak boleh masuk log";

function apiError(statusCode: number | undefined, data?: unknown) {
  return new APICallError({
    message: `Incorrect API key provided: ${SECRET_KEY}`,
    url: "https://api.example.com/v1/messages",
    requestBodyValues: { prompt: ANSWER },
    statusCode,
    responseBody: JSON.stringify(data ?? {}),
    data,
  });
}

const anthropic = (type: string) => ({ type: "error", error: { type } });
const openai = (code: string, type = "invalid_request_error") => ({
  error: { message: "…", type, code },
});
const google = (status: string, reason?: string) => ({
  error: {
    code: 400,
    message: "…",
    status,
    details: reason ? [{ reason }] : [],
  },
});

describe("classifyAiError", () => {
  it.each([
    ["Anthropic 401", apiError(401, anthropic("authentication_error"))],
    ["Anthropic 403", apiError(403, anthropic("permission_error"))],
    ["OpenAI 401", apiError(401, openai("invalid_api_key"))],
    [
      "Google 400",
      apiError(400, google("INVALID_ARGUMENT", "API_KEY_INVALID")),
    ],
  ])("reads %s as an invalid key", (_, error) => {
    expect(classifyAiError(error)).toBe("invalid_key");
  });

  it.each([
    ["Anthropic 402", apiError(402, anthropic("billing_error"))],
    [
      "OpenAI 429 with no credit",
      apiError(429, openai("credit_balance_exhausted")),
    ],
    [
      "OpenAI 429 insufficient_quota",
      apiError(429, openai("insufficient_quota", "insufficient_quota")),
    ],
    [
      "OpenAI spend limit",
      apiError(429, openai("project_spend_limit_exceeded")),
    ],
    ["Google 402", apiError(402, google("FAILED_PRECONDITION"))],
  ])("reads %s as an empty balance", (_, error) => {
    expect(classifyAiError(error)).toBe("quota");
  });

  it.each([
    ["Anthropic", apiError(429, anthropic("rate_limit_error"))],
    ["OpenAI", apiError(429, openai("slow_down"))],
    ["Google", apiError(429, google("RESOURCE_EXHAUSTED"))],
  ])("reads a plain 429 from %s as a rate limit", (_, error) => {
    expect(classifyAiError(error)).toBe("rate_limit");
  });

  it.each([
    ["Anthropic 529", apiError(529, anthropic("overloaded_error"))],
    ["OpenAI 503", apiError(503, openai("server_is_overloaded"))],
    ["Google 503", apiError(503, google("UNAVAILABLE"))],
    ["a 500", apiError(500)],
    ["no response at all", apiError(undefined)],
    ["fetch failing", new TypeError("fetch failed")],
  ])("reads %s as the provider being down", (_, error) => {
    expect(classifyAiError(error)).toBe("unavailable");
  });

  it.each([
    ["Anthropic", apiError(404, anthropic("not_found_error"))],
    ["OpenAI", apiError(404, openai("model_not_found"))],
    ["Google", apiError(404, google("NOT_FOUND"))],
  ])("reads a 404 from %s as an unknown model", (_, error) => {
    expect(classifyAiError(error)).toBe("model_not_found");
  });

  it("reads timeouts and aborts as a timeout", () => {
    expect(classifyAiError(new DOMException("late", "TimeoutError"))).toBe(
      "timeout",
    );
    expect(classifyAiError(new DOMException("stop", "AbortError"))).toBe(
      "timeout",
    );
    expect(classifyAiError(apiError(504))).toBe("timeout");
  });

  it("looks inside a RetryError", () => {
    const error = new RetryError({
      message: "Failed after 3 attempts",
      reason: "maxRetriesExceeded",
      errors: [apiError(500), apiError(429, anthropic("rate_limit_error"))],
    });

    expect(classifyAiError(error)).toBe("rate_limit");
  });

  it("reads output that does not match the schema as bad output", () => {
    const error = new NoObjectGeneratedError({
      message: "could not parse",
      text: "not json",
      response: { id: "r", timestamp: new Date(), modelId: "m" },
      usage: {
        inputTokens: undefined,
        outputTokens: undefined,
        totalTokens: undefined,
      } as never,
      finishReason: "stop",
    });

    expect(classifyAiError(error)).toBe("bad_output");
  });

  it("tells a missing server secret from a key that will not open", () => {
    expect(classifyAiError(new AiConfigError("secret", "x"))).toBe(
      "server_not_ready",
    );
    expect(classifyAiError(new AiConfigError("decrypt", "x"))).toBe(
      "unreadable_key",
    );
  });

  it("falls back to unknown", () => {
    expect(
      classifyAiError(apiError(400, anthropic("invalid_request_error"))),
    ).toBe("unknown");
    expect(classifyAiError(new Error("boom"))).toBe("unknown");
    expect(classifyAiError("boom")).toBe("unknown");
  });
});

describe("AI_ERROR_MESSAGES", () => {
  it("has a sentence for every code", () => {
    for (const code of AI_ERROR_CODES) {
      expect(AI_ERROR_MESSAGES[code]).toMatch(/\.$/);
    }
  });
});

describe("reportAiError", () => {
  afterEach(() => vi.restoreAllMocks());

  it("logs the code and status, never the key, the prompt or the provider's words", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = reportAiError(apiError(401, openai("invalid_api_key")), {
      where: "test",
      provider: "openai",
    });

    expect(result).toEqual({
      code: "invalid_key",
      message: AI_ERROR_MESSAGES.invalid_key,
    });
    expect(log).toHaveBeenCalledOnce();

    const logged = JSON.stringify(log.mock.calls[0]);

    expect(logged).toContain("invalid_key");
    expect(logged).toContain("401");
    expect(logged).not.toContain(SECRET_KEY);
    expect(logged).not.toContain(ANSWER);
    expect(result.message).not.toContain(SECRET_KEY);
  });
});
