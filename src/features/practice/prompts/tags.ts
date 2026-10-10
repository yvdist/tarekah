import type { PracticeLanguage } from "@/db/schema/enum-values";

// What the prompts of practice share: the language they ask for, and the tags
// that fence off text the user wrote.

export const LANGUAGE_NAMES: Record<PracticeLanguage, string> = {
  id: 'Indonesian (Bahasa Indonesia, relaxed and polite, addressing the candidate as "kamu")',
  en: "English",
};

// Every tag a prompt wraps user text in. One list for all prompts, so text
// moved from one into another (an answer quoted in a transcript) stays fenced.
const TAG_NAMES = [
  "question",
  "answer",
  "stories",
  "story",
  "application",
  "company_notes",
  "job_description",
  "transcript",
  "interviewer",
  "candidate",
];

// Text the user wrote must not be able to open or close one of the tags it is
// wrapped in. Only those tags are touched, so code in an answer (a < b,
// List<String>) reaches the model as written.
const TAG_PATTERN = new RegExp(
  `<(?=\\s*/?\\s*(?:${TAG_NAMES.join("|")})\\b)`,
  "gi",
);

export const escapeTags = (text: string) => text.replace(TAG_PATTERN, "&lt;");

// Long pasted text (a job description) is cut, with a mark, so one request
// stays small.
export function clip(text: string, max: number) {
  const trimmed = text.trim();

  return trimmed.length > max ? `${trimmed.slice(0, max)} […]` : trimmed;
}
