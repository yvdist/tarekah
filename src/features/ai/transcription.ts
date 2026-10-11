import type { AiProvider } from "@/db/schema/enum-values";

// The providers that turn a recording into text, and the model each does it
// with. Anthropic and DeepSeek have none. Checked on 2026-10-11 against
// ai.google.dev/gemini-api/docs/transcribe and
// developers.openai.com/api/docs/guides/speech-to-text, which recommends
// gpt-transcribe and retires the older models on 2027-02-26.
export const TRANSCRIPTION_MODELS = {
  google: "gemini-3.5-transcribe",
  openai: "gpt-transcribe",
} as const satisfies Partial<Record<AiProvider, string>>;

export type TranscriptionProvider = keyof typeof TRANSCRIPTION_MODELS;

// Google first: it takes the language as a hint, where gpt-transcribe is left
// to detect it (see transcribeAnswer).
const PREFERENCE: ReadonlyArray<TranscriptionProvider> = ["google", "openai"];

const canTranscribe = (
  provider: AiProvider,
): provider is TranscriptionProvider => provider in TRANSCRIPTION_MODELS;

// Whose key transcribes. The active provider only decides who answers; a
// recording goes to any saved key that can take it, the active one when it can.
export function pickTranscriptionProvider(
  active: AiProvider | null,
  saved: ReadonlyArray<AiProvider>,
): TranscriptionProvider | null {
  if (active && canTranscribe(active) && saved.includes(active)) {
    return active;
  }

  return PREFERENCE.find((provider) => saved.includes(provider)) ?? null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// Google's Interactions API keeps every request, the audio included, unless
// the request says `store: false`, and the SDK has no option for it. This
// fetch adds the field to the JSON body on its way out.
export const withoutStorage: typeof fetch = (input, init) => {
  if (typeof init?.body !== "string") {
    return fetch(input, init);
  }

  const body: unknown = JSON.parse(init.body);

  return fetch(input, {
    ...init,
    body: isRecord(body)
      ? JSON.stringify({ ...body, store: false })
      : init.body,
  });
};
