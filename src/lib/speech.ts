// The rules behind the browser's speech APIs, kept apart from the hooks that
// call them so they can be tested without a browser.

// Chrome and Safari still ship speech recognition under the prefixed name.
export function findSpeechRecognition<T>(scope: {
  SpeechRecognition?: T;
  webkitSpeechRecognition?: T;
}): T | null {
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

export type SpokenPart = { text: string; final: boolean };

const tidy = (text: string) => text.replace(/\s+/g, " ").trim();

export function joinSpoken(pieces: ReadonlyArray<string>): string {
  return tidy(pieces.join(" "));
}

// What one run of the recognizer holds: the words it has settled on, and the
// ones it may still change.
export function readParts(parts: ReadonlyArray<SpokenPart>): {
  finals: string;
  interim: string;
} {
  const said = (final: boolean) =>
    joinSpoken(
      parts.filter((part) => part.final === final).map((part) => part.text),
    );

  return { finals: said(true), interim: said(false) };
}

// A pause to think is part of an answer, so silence alone does not turn the
// microphone off. This many silent runs in a row does: nobody is there.
export const MAX_SILENT_RUNS = 3;

export type RunEnd = {
  stopRequested: boolean;
  // The recognizer's error code for this run, if it reported one.
  error: string | null;
  heard: boolean;
  // Silent runs in a row before this one.
  silentRuns: number;
};

export type AfterRun =
  | { next: "restart"; silentRuns: number }
  | { next: "stop"; reason: "requested" | "silence" | "error" };

// Browsers end a run on their own after a few seconds of silence. Listening
// goes on until the user stops it, so a run that ends is started again.
export function afterRun(end: RunEnd): AfterRun {
  if (end.stopRequested) {
    return { next: "stop", reason: "requested" };
  }

  if (end.error && end.error !== "no-speech") {
    return { next: "stop", reason: "error" };
  }

  if (end.heard) {
    return { next: "restart", silentRuns: 0 };
  }

  const silentRuns = end.silentRuns + 1;

  return silentRuns >= MAX_SILENT_RUNS
    ? { next: "stop", reason: "silence" }
    : { next: "restart", silentRuns };
}

// Chrome's network voices cut an utterance off after about fourteen seconds,
// so text is spoken a sentence at a time, and a long sentence in pieces.
export function splitForSpeech(text: string, maxLength: number): string[] {
  const chunks: string[] = [];

  for (const sentence of text.split(/(?<=[.!?…])\s+/)) {
    let chunk = "";

    for (const word of sentence.split(/\s+/).filter(Boolean)) {
      if (chunk && chunk.length + 1 + word.length > maxLength) {
        chunks.push(chunk);
        chunk = word;
      } else {
        chunk = chunk ? `${chunk} ${word}` : word;
      }
    }

    if (chunk) {
      chunks.push(chunk);
    }
  }

  return chunks;
}

// Android reports "id_ID" where everyone else says "id-ID".
const tagOf = (lang: string) => lang.replace("_", "-").toLowerCase();

// The voice to read a locale with: the exact locale before another region of
// the language, and a voice of the device before one that needs the network.
// Null when none speaks the language, since any other voice would mangle it.
export function pickVoice<V extends { lang: string; localService: boolean }>(
  voices: ReadonlyArray<V>,
  locale: string,
): V | null {
  const wanted = tagOf(locale);
  const language = wanted.split("-")[0];
  const exact = voices.filter((voice) => tagOf(voice.lang) === wanted);
  const related = voices.filter(
    (voice) => tagOf(voice.lang).split("-")[0] === language,
  );
  const candidates = exact.length > 0 ? exact : related;

  return (
    candidates.find((voice) => voice.localService) ?? candidates[0] ?? null
  );
}
