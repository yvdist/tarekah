import { transcribe, type TranscriptionModel } from "ai";
import type { PracticeLanguage } from "@/db/schema/enum-values";
import { ANSWER_MAX_LENGTH } from "./schemas";
import { SPEECH_LOCALES } from "./voice";

// Shorter than the pages' maxDuration, so the user reads a message instead of
// a request the platform cut.
const TRANSCRIPTION_TIMEOUT_MS = 30_000;

export type AudioContainer = "ogg" | "webm";

const SIGNATURES: ReadonlyArray<[AudioContainer, ReadonlyArray<number>]> = [
  ["ogg", [0x4f, 0x67, 0x67, 0x53]],
  ["webm", [0x1a, 0x45, 0xdf, 0xa3]],
];

// What a recording is, from its first bytes: the two containers the recorder
// produces and both providers document. Null for anything else, which is not
// sent anywhere.
export function audioContainerOf(bytes: Uint8Array): AudioContainer | null {
  const found = SIGNATURES.find(([, signature]) =>
    signature.every((byte, index) => bytes[index] === byte),
  );

  return found ? found[0] : null;
}

// Turns one recorded answer into text. It throws what the SDK throws; the
// caller turns that into a message with reportAiError and never logs it, since
// the error carries the audio.
//
// The language goes to Google as a hint. OpenAI gets none: its SDK provider
// sends fields gpt-transcribe does not take as soon as it is given options, so
// that model detects the language itself.
export async function transcribeAnswer({
  model,
  audio,
  language,
}: {
  model: TranscriptionModel;
  audio: Uint8Array;
  language: PracticeLanguage;
}): Promise<string> {
  const { text } = await transcribe({
    model,
    audio,
    providerOptions: { google: { languageCodes: [SPEECH_LOCALES[language]] } },
    // One upload per recording: a retry would send the audio again.
    maxRetries: 0,
    abortSignal: AbortSignal.timeout(TRANSCRIPTION_TIMEOUT_MS),
  });

  return text.replace(/\s+/g, " ").trim().slice(0, ANSWER_MAX_LENGTH);
}
