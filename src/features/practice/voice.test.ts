import { describe, expect, it } from "vitest";
import {
  appendSpoken,
  describeSpeechError,
  describeSpokenDuration,
  pickVoicePath,
  SPEECH_LOCALES,
} from "./voice";

describe("SPEECH_LOCALES", () => {
  it("has a locale for each practice language", () => {
    expect(SPEECH_LOCALES).toEqual({ id: "id-ID", en: "en-US" });
  });
});

describe("pickVoicePath", () => {
  it("uses the browser's speech recognition where there is one", () => {
    expect(pickVoicePath({ speechRecognition: true })).toBe("speech");
  });

  it("has no path without it", () => {
    expect(pickVoicePath({ speechRecognition: false })).toBe("none");
  });
});

describe("appendSpoken", () => {
  it("fills an empty answer", () => {
    expect(appendSpoken("", "waktu itu sistem kami lambat", 100)).toBe(
      "waktu itu sistem kami lambat",
    );
  });

  it("continues what was already written after a space", () => {
    expect(appendSpoken("Waktu itu", "sistem kami lambat", 100)).toBe(
      "Waktu itu sistem kami lambat",
    );
  });

  it("adds no space after a line break", () => {
    expect(appendSpoken("Pertama.\n", "Kedua", 100)).toBe("Pertama.\nKedua");
  });

  it("leaves the answer alone when nothing was heard", () => {
    expect(appendSpoken("Waktu itu ", "", 100)).toBe("Waktu itu ");
  });

  it("stops at the longest answer allowed", () => {
    expect(appendSpoken("abc", "defgh", 6)).toBe("abc de");
  });
});

describe("describeSpeechError", () => {
  it.each(["not-allowed", "service-not-allowed"])(
    "explains a refused microphone for %s",
    (code) => {
      expect(describeSpeechError(code)).toMatch(/^Izin mikrofon/);
    },
  );

  it.each(["audio-capture", "network", "language-not-supported", "whatever"])(
    "says what to do about %s",
    (code) => {
      expect(describeSpeechError(code)).toMatch(/mengetik\.$/);
    },
  );

  it("says nothing about a recognition that was cut off", () => {
    expect(describeSpeechError("aborted")).toBeNull();
  });
});

describe("describeSpokenDuration", () => {
  it.each([
    [0, "kurang dari satu menit"],
    [44, "kurang dari satu menit"],
    [45, "sekitar 1 menit"],
    [74, "sekitar 1 menit"],
    [80, "sekitar 1,5 menit"],
    [118, "sekitar 2 menit"],
    [150, "sekitar 2,5 menit"],
    [600, "sekitar 10 menit"],
  ])("reads %i seconds as %j", (seconds, phrase) => {
    expect(describeSpokenDuration(seconds)).toBe(phrase);
  });
});
