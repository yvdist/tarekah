import { afterEach, describe, expect, it, vi } from "vitest";
import {
  pickTranscriptionProvider,
  TRANSCRIPTION_MODELS,
  withoutStorage,
} from "./transcription";

describe("TRANSCRIPTION_MODELS", () => {
  it("names a model for the two providers that have one", () => {
    expect(Object.keys(TRANSCRIPTION_MODELS).sort()).toEqual([
      "google",
      "openai",
    ]);
  });
});

describe("pickTranscriptionProvider", () => {
  it("uses the active provider when it can transcribe", () => {
    expect(pickTranscriptionProvider("openai", ["google", "openai"])).toBe(
      "openai",
    );
  });

  it("uses another saved key when the active provider cannot", () => {
    expect(pickTranscriptionProvider("deepseek", ["deepseek", "openai"])).toBe(
      "openai",
    );
  });

  it("prefers Google among the keys that are not active", () => {
    expect(
      pickTranscriptionProvider("anthropic", ["anthropic", "openai", "google"]),
    ).toBe("google");
  });

  it("is null when no saved key can transcribe", () => {
    expect(
      pickTranscriptionProvider("deepseek", ["anthropic", "deepseek"]),
    ).toBeNull();
    expect(pickTranscriptionProvider(null, [])).toBeNull();
  });

  it("does not trust an active provider whose key is gone", () => {
    expect(pickTranscriptionProvider("google", ["anthropic"])).toBeNull();
  });
});

describe("withoutStorage", () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubFetch() {
    const fetched = vi.fn(async () => new Response("{}"));

    vi.stubGlobal("fetch", fetched);

    return fetched;
  }

  it("tells the provider not to keep the request", async () => {
    const fetched = stubFetch();

    await withoutStorage("https://example.com/interactions", {
      method: "POST",
      headers: { "x-goog-api-key": "key" },
      body: JSON.stringify({ model: "m", input: [{ type: "audio" }] }),
    });

    expect(fetched).toHaveBeenCalledWith("https://example.com/interactions", {
      method: "POST",
      headers: { "x-goog-api-key": "key" },
      body: JSON.stringify({
        model: "m",
        input: [{ type: "audio" }],
        store: false,
      }),
    });
  });

  it("leaves a body alone that is not a JSON object", async () => {
    const fetched = stubFetch();
    const form = new FormData();

    await withoutStorage("https://example.com", { method: "POST", body: form });
    await withoutStorage("https://example.com", { method: "POST", body: "[]" });
    await withoutStorage("https://example.com");

    expect(fetched.mock.calls).toEqual([
      ["https://example.com", { method: "POST", body: form }],
      ["https://example.com", { method: "POST", body: "[]" }],
      ["https://example.com", undefined],
    ]);
  });
});
