import type { PracticeLanguage } from "@/db/schema/enum-values";

// Common words that only one of the two languages uses.
const WORDS: Record<PracticeLanguage, ReadonlySet<string>> = {
  id: new Set([
    "yang",
    "dan",
    "di",
    "ke",
    "dari",
    "untuk",
    "dengan",
    "apa",
    "bagaimana",
    "kenapa",
    "mengapa",
    "kamu",
    "anda",
    "saat",
    "ketika",
    "pernah",
    "ceritakan",
    "jelaskan",
    "tentang",
    "atau",
    "tidak",
    "itu",
    "ini",
    "pada",
    "cara",
  ]),
  en: new Set([
    "the",
    "and",
    "of",
    "to",
    "a",
    "you",
    "your",
    "what",
    "how",
    "why",
    "when",
    "tell",
    "me",
    "about",
    "describe",
    "explain",
    "would",
    "with",
    "is",
    "are",
    "did",
    "do",
    "have",
    "time",
    "between",
  ]),
};

// A first guess at the language of a question, so feedback starts in the
// language it was asked in. The user can change it; a tie is Indonesian, the
// language of the app.
export function detectLanguage(text: string): PracticeLanguage {
  const words = text.toLowerCase().match(/[a-z]+/g) ?? [];
  const count = (language: PracticeLanguage) =>
    words.filter((word) => WORDS[language].has(word)).length;

  return count("en") > count("id") ? "en" : "id";
}
