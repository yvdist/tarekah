import type { PracticeLanguage } from "@/db/schema/enum-values";

// The locale an answer is listened to in, and an interviewer read aloud in.
export const SPEECH_LOCALES: Record<PracticeLanguage, string> = {
  id: "id-ID",
  en: "en-US",
};

export type VoicePath = "speech" | "record" | "none";

// How an answer can be spoken in this browser. Typing is always there; this
// only decides whether a microphone is offered next to it. The browser's own
// recognition comes first: it needs no key and shows the words as they come.
// Without it the answer is recorded and transcribed, which takes a recorder
// and a saved key that can transcribe.
export function pickVoicePath(has: {
  speechRecognition: boolean;
  recorder: boolean;
  transcription: boolean;
}): VoicePath {
  if (has.speechRecognition) {
    return "speech";
  }

  return has.recorder && has.transcription ? "record" : "none";
}

// The answer as it stood when the microphone was turned on, followed by what
// has been heard since, cut at the longest answer the form accepts.
export function appendSpoken(base: string, heard: string, max: number): string {
  if (heard === "") {
    return base;
  }

  const gap = base === "" || /\s$/.test(base) ? "" : " ";

  return `${base}${gap}${heard}`.slice(0, max);
}

const TYPE_INSTEAD = "lanjutkan dengan mengetik.";

// What the user reads when the recognizer gives up, from its error code. Null
// for a recognition that was only cut off, which needs no explaining.
export function describeSpeechError(code: string): string | null {
  switch (code) {
    case "aborted":
      return null;
    case "not-allowed":
    case "service-not-allowed":
      return `Izin mikrofon belum diberikan. Izinkan di pengaturan situs browser-mu, atau ${TYPE_INSTEAD}`;
    case "audio-capture":
      return `Mikrofon tidak ditemukan. Periksa perangkatnya, atau ${TYPE_INSTEAD}`;
    case "network":
      return `Layanan pengenal ucapan browser tidak bisa dihubungi. Periksa koneksimu, atau ${TYPE_INSTEAD}`;
    case "language-not-supported":
      return `Browser ini belum mengenali ucapan dalam bahasa itu. Untuk sekarang, ${TYPE_INSTEAD}`;
    default:
      return `Mikrofon berhenti karena ada yang tidak beres. Coba lagi, atau ${TYPE_INSTEAD}`;
  }
}

// The recorder fails with the name of a DOMException where the recognizer has
// its own codes. The causes are the same, and so is what the user reads.
const RECORDER_ERROR_CODES: Record<string, string> = {
  NotAllowedError: "not-allowed",
  SecurityError: "not-allowed",
  NotFoundError: "audio-capture",
  NotReadableError: "audio-capture",
};

export function describeRecorderError(name: string): string {
  return (
    describeSpeechError(RECORDER_ERROR_CODES[name] ?? "unknown") ??
    `Mikrofon berhenti karena ada yang tidak beres. Coba lagi, atau ${TYPE_INSTEAD}`
  );
}

// How long an answer was spoken for, to the half minute. Information, not a
// verdict: no length is called short or long.
export function describeSpokenDuration(seconds: number): string {
  if (seconds < 45) {
    return "kurang dari satu menit";
  }

  const minutes = Math.round(seconds / 30) / 2;

  return `sekitar ${String(minutes).replace(".", ",")} menit`;
}

// Where this browser remembers that the note about its speech service was
// read, that the one about recordings going to a provider was, and whether
// the interviewer is read aloud. Kept on the device: all three depend on the
// browser in use, not on the account.
export const VOICE_NOTICE_KEY = "tarekah:voice-notice";
export const RECORDING_NOTICE_KEY = "tarekah:recording-notice";
export const INTERVIEWER_VOICE_KEY = "tarekah:interviewer-voice";
