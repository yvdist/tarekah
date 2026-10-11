import { describe, expect, it } from "vitest";
import {
  afterRun,
  findSpeechRecognition,
  joinSpoken,
  MAX_SILENT_RUNS,
  pickVoice,
  readParts,
  splitForSpeech,
} from "./speech";

describe("findSpeechRecognition", () => {
  it("prefers the standard name", () => {
    expect(
      findSpeechRecognition({
        SpeechRecognition: "standard",
        webkitSpeechRecognition: "prefixed",
      }),
    ).toBe("standard");
  });

  it("falls back to the prefixed name", () => {
    expect(findSpeechRecognition({ webkitSpeechRecognition: "prefixed" })).toBe(
      "prefixed",
    );
  });

  it("is null where the browser has neither", () => {
    expect(findSpeechRecognition({})).toBeNull();
  });
});

describe("readParts", () => {
  it("separates what is settled from what is still being heard", () => {
    expect(
      readParts([
        { text: "Waktu itu", final: true },
        { text: " sistem kami", final: true },
        { text: " lambat di", final: false },
      ]),
    ).toEqual({ finals: "Waktu itu sistem kami", interim: "lambat di" });
  });

  it("is empty before anything is heard", () => {
    expect(readParts([])).toEqual({ finals: "", interim: "" });
  });
});

describe("joinSpoken", () => {
  it("joins the pieces with single spaces", () => {
    expect(joinSpoken(["Waktu itu ", "", "  sistem\nkami", "lambat"])).toBe(
      "Waktu itu sistem kami lambat",
    );
  });

  it("is empty when nothing was said", () => {
    expect(joinSpoken(["", "  "])).toBe("");
  });
});

describe("afterRun", () => {
  const run = {
    stopRequested: false,
    error: null,
    heard: true,
    silentRuns: 0,
  };

  it("starts again after a run that heard something", () => {
    expect(afterRun({ ...run, silentRuns: 1 })).toEqual({
      next: "restart",
      silentRuns: 0,
    });
  });

  it("stops when the user asked for it, whatever else happened", () => {
    expect(
      afterRun({ ...run, stopRequested: true, error: "not-allowed" }),
    ).toEqual({ next: "stop", reason: "requested" });
  });

  it("stops on an error", () => {
    expect(afterRun({ ...run, error: "not-allowed" })).toEqual({
      next: "stop",
      reason: "error",
    });
  });

  it("counts a silent run and starts again", () => {
    expect(afterRun({ ...run, heard: false, error: "no-speech" })).toEqual({
      next: "restart",
      silentRuns: 1,
    });
  });

  it("counts a run that ended without a word as silent", () => {
    expect(afterRun({ ...run, heard: false })).toEqual({
      next: "restart",
      silentRuns: 1,
    });
  });

  it("stops after too many silent runs in a row", () => {
    expect(
      afterRun({
        ...run,
        heard: false,
        error: "no-speech",
        silentRuns: MAX_SILENT_RUNS - 1,
      }),
    ).toEqual({ next: "stop", reason: "silence" });
  });
});

describe("splitForSpeech", () => {
  it("speaks one sentence at a time", () => {
    expect(
      splitForSpeech("Terima kasih. Boleh ceritakan dirimu? Baik!", 80),
    ).toEqual(["Terima kasih.", "Boleh ceritakan dirimu?", "Baik!"]);
  });

  it("breaks a long sentence between words", () => {
    const chunks = splitForSpeech(
      "satu dua tiga empat lima enam tujuh delapan sembilan sepuluh",
      20,
    );

    expect(chunks).toEqual([
      "satu dua tiga empat",
      "lima enam tujuh",
      "delapan sembilan",
      "sepuluh",
    ]);
  });

  it("has nothing to say for blank text", () => {
    expect(splitForSpeech("  \n ", 80)).toEqual([]);
  });
});

describe("pickVoice", () => {
  const voice = (lang: string, localService = false) => ({
    lang,
    localService,
  });

  it("prefers a voice of the device in the exact locale", () => {
    const local = voice("id-ID", true);

    expect(
      pickVoice([voice("en-US", true), voice("id-ID"), local], "id-ID"),
    ).toBe(local);
  });

  it("reads Android's underscore tags", () => {
    const android = voice("id_ID");

    expect(pickVoice([voice("en_US"), android], "id-ID")).toBe(android);
  });

  it("accepts another region of the same language", () => {
    const british = voice("en-GB");

    expect(pickVoice([voice("id-ID"), british], "en-US")).toBe(british);
  });

  it("is null when no voice speaks the language", () => {
    expect(pickVoice([voice("en-US"), voice("ja-JP")], "id-ID")).toBeNull();
    expect(pickVoice([], "id-ID")).toBeNull();
  });
});
