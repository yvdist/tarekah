import { and, eq, isNotNull } from "drizzle-orm";
import { interviews, questions } from "@/db/schema";
import { splitQuestions } from "@/features/interviews/questions";
import { withOrder, type Database } from "./data";

export type BackfillSummary = {
  // Interviews whose markdown held at least one question.
  interviews: number;
  inserted: number;
  // Questions that were already in the table for that interview.
  skipped: number;
};

// Copies the questions still held as markdown in interviews.questions into
// the questions table, one row per line, with the interview and application
// they came from. Idempotent: a text already present for that interview (same
// text, ignoring case and spacing) is skipped, so running it twice changes
// nothing. The markdown column is left as it is.
export async function backfillQuestions(
  db: Database,
  options: { dryRun?: boolean } = {},
): Promise<BackfillSummary> {
  const summary: BackfillSummary = { interviews: 0, inserted: 0, skipped: 0 };

  const sources = await db
    .select({
      id: interviews.id,
      userId: interviews.userId,
      applicationId: interviews.applicationId,
      questions: interviews.questions,
    })
    .from(interviews)
    .where(isNotNull(interviews.questions))
    .orderBy(interviews.scheduledAt, interviews.id);

  for (const source of sources) {
    const texts = dedupe(splitQuestions(source.questions ?? ""));

    if (texts.length === 0) {
      continue;
    }

    summary.interviews += 1;

    const existing = await db
      .select({ text: questions.text })
      .from(questions)
      .where(
        and(
          eq(questions.userId, source.userId),
          eq(questions.interviewId, source.id),
        ),
      );
    const present = new Set(existing.map((row) => normalize(row.text)));
    const fresh = texts.filter((text) => !present.has(normalize(text)));

    summary.skipped += texts.length - fresh.length;
    summary.inserted += fresh.length;

    if (fresh.length === 0 || options.dryRun) {
      continue;
    }

    await db.insert(questions).values(
      withOrder(
        fresh.map((text) => ({ text })),
        Date.now(),
      ).map((row) => ({
        ...row,
        userId: source.userId,
        interviewId: source.id,
        applicationId: source.applicationId,
        source: "interview" as const,
      })),
    );
  }

  return summary;
}

const normalize = (text: string) =>
  text.trim().replace(/\s+/g, " ").toLowerCase();

// The same question twice in one interview is a typo, not two questions.
function dedupe(texts: string[]) {
  const seen = new Set<string>();

  return texts.filter((text) => {
    const key = normalize(text);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);

    return true;
  });
}
