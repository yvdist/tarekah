import { describe, expect, it } from "vitest";
import { splitQuestions } from "./questions";

describe("splitQuestions", () => {
  it("returns one entry per line", () => {
    expect(
      splitQuestions("Ceritakan tentang diri Anda\nKenapa melamar?"),
    ).toEqual(["Ceritakan tentang diri Anda", "Kenapa melamar?"]);
  });

  it("strips bullet and numbered list markers", () => {
    expect(
      splitQuestions("- satu\n* dua\n+ tiga\n1. empat\n2) lima\n  - enam"),
    ).toEqual(["satu", "dua", "tiga", "empat", "lima", "enam"]);
  });

  it("drops empty lines and handles Windows line endings", () => {
    expect(splitQuestions("satu\r\n\r\n   \r\ndua\r\n")).toEqual([
      "satu",
      "dua",
    ]);
  });

  it("keeps text that only looks like a marker", () => {
    expect(splitQuestions("-5 derajat?\n3.14 itu apa?\n*penting*")).toEqual([
      "-5 derajat?",
      "3.14 itu apa?",
      "*penting*",
    ]);
  });

  it("returns nothing for empty text", () => {
    expect(splitQuestions("")).toEqual([]);
    expect(splitQuestions("\n- \n")).toEqual([]);
  });
});
