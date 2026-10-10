import { describe, expect, it } from "vitest";
import { detectLanguage } from "./language";

describe("detectLanguage", () => {
  it.each([
    "Ceritakan saat kamu berbeda pendapat dengan atasan.",
    "Bagaimana cara kamu menangani deadline yang mepet?",
    "Kenapa kamu ingin pindah dari perusahaan sekarang?",
    "Jelaskan perbedaan antara REST dan GraphQL.",
  ])("reads %j as Indonesian", (text) => {
    expect(detectLanguage(text)).toBe("id");
  });

  it.each([
    "Tell me about a time you disagreed with your manager.",
    "How would you design a rate limiter?",
    "What is the difference between a process and a thread?",
    "Why do you want to leave your current company?",
  ])("reads %j as English", (text) => {
    expect(detectLanguage(text)).toBe("en");
  });

  it.each(["", "CAP theorem?", "Redis vs Memcached"])(
    "falls back to Indonesian for %j",
    (text) => {
      expect(detectLanguage(text)).toBe("id");
    },
  );
});
