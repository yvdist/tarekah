import { createGoogle } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { MockTranscriptionModelV4 } from "ai/test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { classifyAiError } from "@/features/ai/errors";
import {
  createFakeTranscriptionModel,
  FAKE_TRANSCRIPT,
} from "@/features/ai/fake-model";
import {
  TRANSCRIPTION_MODELS,
  withoutStorage,
} from "@/features/ai/transcription";
import { ANSWER_MAX_LENGTH } from "./schemas";
import { audioContainerOf, transcribeAnswer } from "./transcription";

// The first bytes of the two containers a browser records in.
const OGG = new Uint8Array([0x4f, 0x67, 0x67, 0x53, 0, 2, 0, 0]);
const WEBM = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81]);

type Generate = NonNullable<
  ConstructorParameters<typeof MockTranscriptionModelV4>[0]
>["doGenerate"];
type Call = Parameters<NonNullable<Generate>>[0];

// A model that hears every recording as the given text.
function modelHearing(text: string, calls: Call[] = []) {
  return new MockTranscriptionModelV4({
    doGenerate: async (options) => {
      calls.push(options);

      return {
        text,
        segments: [],
        language: undefined,
        durationInSeconds: undefined,
        warnings: [],
        response: { timestamp: new Date(), modelId: "mock" },
      };
    },
  });
}

describe("audioContainerOf", () => {
  it("recognizes the containers the recorder produces", () => {
    expect(audioContainerOf(OGG)).toBe("ogg");
    expect(audioContainerOf(WEBM)).toBe("webm");
  });

  it("refuses anything else", () => {
    // RIFF (wav), ID3 (mp3), an MP4 box, text, and nothing at all.
    expect(
      audioContainerOf(new Uint8Array([0x52, 0x49, 0x46, 0x46])),
    ).toBeNull();
    expect(
      audioContainerOf(new Uint8Array([0x49, 0x44, 0x33, 0x04])),
    ).toBeNull();
    expect(
      audioContainerOf(new Uint8Array([0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70])),
    ).toBeNull();
    expect(
      audioContainerOf(new TextEncoder().encode("OggS".slice(1))),
    ).toBeNull();
    expect(audioContainerOf(new Uint8Array())).toBeNull();
  });
});

describe("transcribeAnswer", () => {
  it("returns what was heard as one tidy line", async () => {
    const calls: Call[] = [];
    const model = modelHearing("  Waktu itu\n sistem kami   lambat. ", calls);

    expect(await transcribeAnswer({ model, audio: WEBM, language: "id" })).toBe(
      "Waktu itu sistem kami lambat.",
    );
    expect(calls).toHaveLength(1);
    expect(calls[0]?.mediaType).toBe("audio/webm");
    expect(calls[0]?.abortSignal).toBeInstanceOf(AbortSignal);
  });

  it("cuts a transcript at the longest answer allowed", async () => {
    const model = modelHearing("a".repeat(ANSWER_MAX_LENGTH + 50));

    expect(
      await transcribeAnswer({ model, audio: OGG, language: "en" }),
    ).toHaveLength(ANSWER_MAX_LENGTH);
  });

  it("does not send a recording twice when the provider fails", async () => {
    let attempts = 0;
    const model = new MockTranscriptionModelV4({
      doGenerate: async () => {
        attempts += 1;

        throw Object.assign(new Error("overloaded"), { isRetryable: true });
      },
    });

    await expect(
      transcribeAnswer({ model, audio: OGG, language: "id" }),
    ).rejects.toThrow("overloaded");
    expect(attempts).toBe(1);
  });

  it("hears the canned transcript from the fake model", async () => {
    const model = createFakeTranscriptionModel("any");

    expect(await transcribeAnswer({ model, audio: OGG, language: "id" })).toBe(
      FAKE_TRANSCRIPT,
    );
  });
});

// What actually leaves for each provider, with the network replaced. These pin
// what transcribeAnswer relies on in the SDK's providers: an upgrade that
// changes it should fail here, not in front of a user.
describe("the request to a provider", () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubFetch(body: unknown, status = 200) {
    const fetched = vi.fn<typeof fetch>(
      async () =>
        new Response(JSON.stringify(body), {
          status,
          headers: { "content-type": "application/json" },
        }),
    );

    vi.stubGlobal("fetch", fetched);

    return fetched;
  }

  it("gives Google the language and asks it not to keep the audio", async () => {
    const fetched = stubFetch({
      steps: [{ content: [{ type: "text", text: "Halo, saya Rani." }] }],
    });
    const model = createGoogle({
      apiKey: "google-key-for-tests",
      fetch: withoutStorage,
    }).transcription(TRANSCRIPTION_MODELS.google);

    expect(await transcribeAnswer({ model, audio: OGG, language: "id" })).toBe(
      "Halo, saya Rani.",
    );

    const [url, init] = fetched.mock.calls[0] ?? [];

    expect(String(url)).toMatch(/\/interactions$/);
    expect(JSON.parse(String(init?.body))).toEqual({
      model: "gemini-3.5-transcribe",
      input: [
        {
          type: "audio",
          data: Buffer.from(OGG).toString("base64"),
          mime_type: "audio/ogg",
        },
      ],
      generation_config: {
        transcription_config: { language_codes: ["id-ID"] },
      },
      store: false,
    });
  });

  it("sends OpenAI the file and the model, and nothing it would refuse", async () => {
    const fetched = stubFetch({ text: "Hello, I am Rani." });
    const model = createOpenAI({
      apiKey: "openai-key-for-tests",
    }).transcription(TRANSCRIPTION_MODELS.openai);

    expect(await transcribeAnswer({ model, audio: WEBM, language: "en" })).toBe(
      "Hello, I am Rani.",
    );

    const [url, init] = fetched.mock.calls[0] ?? [];
    const form = init?.body;

    expect(String(url)).toMatch(/\/audio\/transcriptions$/);

    if (!(form instanceof FormData)) {
      expect.unreachable();
    }

    const file = form.get("file");

    expect([...form.keys()].sort()).toEqual(["file", "model"]);
    expect(form.get("model")).toBe("gpt-transcribe");
    expect(file).toBeInstanceOf(File);
    expect(file).toMatchObject({ name: "audio.webm", type: "audio/webm" });
  });

  it("reads a refused key like any other provider error", async () => {
    stubFetch(
      {
        error: {
          message: "bad key",
          type: "invalid_request_error",
          code: "invalid_api_key",
        },
      },
      401,
    );

    const model = createOpenAI({
      apiKey: "openai-key-for-tests",
    }).transcription(TRANSCRIPTION_MODELS.openai);
    const failure = await transcribeAnswer({
      model,
      audio: WEBM,
      language: "en",
    }).catch((error: unknown) => error);

    expect(classifyAiError(failure)).toBe("invalid_key");
  });
});
