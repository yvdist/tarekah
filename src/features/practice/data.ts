import { and, asc, eq } from "drizzle-orm";
import {
  practiceSessions,
  practiceTurns,
  questions,
  questionStories,
  stories,
} from "@/db/schema";
import type { PracticeLanguage } from "@/db/schema/enum-values";
import type { Database } from "@/features/questions/data";
import type { StoredFeedback } from "./schemas";

// The SQL of practice. The database is passed in rather than imported, so the
// same statements run against the pool and against an in-memory Postgres in
// tests. Callers own authorization and caching.

export type PracticeQuestion = NonNullable<
  Awaited<ReturnType<typeof findPracticeQuestion>>
>;

// One question with the stories linked to it in full, or null when it does not
// exist or belongs to someone else.
export async function findPracticeQuestion(
  db: Database,
  userId: string,
  id: string,
) {
  const [question] = await db
    .select({
      id: questions.id,
      text: questions.text,
      category: questions.category,
      readiness: questions.readiness,
    })
    .from(questions)
    .where(and(eq(questions.id, id), eq(questions.userId, userId)))
    .limit(1);

  if (!question) {
    return null;
  }

  return { ...question, stories: await listLinkedStories(db, userId, id) };
}

// The stories a question is linked to, with their four parts: the crib shown
// while answering, and the background the model checks facts against.
export async function listLinkedStories(
  db: Database,
  userId: string,
  questionId: string,
) {
  return db
    .select({
      id: stories.id,
      title: stories.title,
      situation: stories.situation,
      task: stories.task,
      action: stories.action,
      result: stories.result,
    })
    .from(questionStories)
    .innerJoin(
      stories,
      and(eq(stories.id, questionStories.storyId), eq(stories.userId, userId)),
    )
    .where(
      and(
        eq(questionStories.questionId, questionId),
        eq(questionStories.userId, userId),
      ),
    )
    .orderBy(asc(stories.title), asc(stories.id));
}

// Saves one attempt: a session with the question as the interviewer's turn and
// the answer as the candidate's. A drill is over once it is answered, so the
// session is completed here, whether or not feedback follows. Returns null
// when the question is not the user's.
export async function createDrillSession(
  db: Database,
  userId: string,
  input: { questionId: string; answer: string; language: PracticeLanguage },
) {
  return db.transaction(async (tx) => {
    const [question] = await tx
      .select({
        id: questions.id,
        text: questions.text,
        applicationId: questions.applicationId,
      })
      .from(questions)
      .where(
        and(eq(questions.id, input.questionId), eq(questions.userId, userId)),
      )
      .limit(1);

    if (!question) {
      return null;
    }

    const [session] = await tx
      .insert(practiceSessions)
      .values({
        userId,
        applicationId: question.applicationId,
        mode: "drill",
        language: input.language,
        status: "completed",
        endedAt: new Date(),
      })
      .returning({ id: practiceSessions.id });

    await tx.insert(practiceTurns).values([
      {
        userId,
        sessionId: session.id,
        position: 0,
        role: "interviewer",
        content: question.text,
        questionId: question.id,
      },
      {
        userId,
        sessionId: session.id,
        position: 1,
        role: "candidate",
        content: input.answer,
        questionId: question.id,
      },
    ]);

    return { sessionId: session.id };
  });
}

// One drill as it was saved: the question as it read then, the answer, and the
// feedback if there is any. `questionId` is null once the question has been
// deleted from the bank. Null when the session is not the user's drill.
export async function findDrillSession(
  db: Database,
  userId: string,
  sessionId: string,
) {
  const turns = await db
    .select({
      id: practiceTurns.id,
      role: practiceTurns.role,
      content: practiceTurns.content,
      questionId: practiceTurns.questionId,
      feedback: practiceTurns.feedback,
      language: practiceSessions.language,
    })
    .from(practiceTurns)
    .innerJoin(
      practiceSessions,
      and(
        eq(practiceSessions.id, practiceTurns.sessionId),
        eq(practiceSessions.userId, userId),
        eq(practiceSessions.mode, "drill"),
      ),
    )
    .where(
      and(
        eq(practiceTurns.sessionId, sessionId),
        eq(practiceTurns.userId, userId),
      ),
    )
    .orderBy(asc(practiceTurns.position));

  const asked = turns.find((turn) => turn.role === "interviewer");
  const answered = turns.find((turn) => turn.role === "candidate");

  if (!asked || !answered) {
    return null;
  }

  return {
    id: sessionId,
    language: answered.language,
    questionId: asked.questionId,
    question: asked.content,
    answerTurnId: answered.id,
    answer: answered.content,
    // jsonb: the caller reads it through storedFeedbackSchema.
    feedback: answered.feedback,
  };
}

// Writes feedback onto the candidate's turn. Returns false when the turn is
// not the user's.
export async function saveTurnFeedback(
  db: Database,
  userId: string,
  turnId: string,
  feedback: StoredFeedback,
) {
  const updated = await db
    .update(practiceTurns)
    .set({ feedback })
    .where(
      and(
        eq(practiceTurns.id, turnId),
        eq(practiceTurns.userId, userId),
        eq(practiceTurns.role, "candidate"),
      ),
    )
    .returning({ id: practiceTurns.id });

  return updated.length > 0;
}

// How two questions are compared: case, spacing and closing punctuation do not
// make a different question.
export function normalizeQuestionText(text: string) {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[\s?.!]+$/, "");
}

// Adds a follow-up question from feedback to the bank, marked as coming from
// practice. It takes the category and the application of the question it
// follows, when that one still exists. Refused when the user already has the
// same question.
export async function addFollowUpQuestion(
  db: Database,
  userId: string,
  input: { text: string; originQuestionId: string | null },
): Promise<{ status: "created"; id: string } | { status: "duplicate" }> {
  return db.transaction(async (tx) => {
    const existing = await tx
      .select({ text: questions.text })
      .from(questions)
      .where(eq(questions.userId, userId));
    const wanted = normalizeQuestionText(input.text);

    if (existing.some((row) => normalizeQuestionText(row.text) === wanted)) {
      return { status: "duplicate" };
    }

    const [origin] = input.originQuestionId
      ? await tx
          .select({
            category: questions.category,
            applicationId: questions.applicationId,
          })
          .from(questions)
          .where(
            and(
              eq(questions.id, input.originQuestionId),
              eq(questions.userId, userId),
            ),
          )
          .limit(1)
      : [];

    const [question] = await tx
      .insert(questions)
      .values({
        userId,
        text: input.text,
        source: "ai",
        category: origin?.category ?? "other",
        applicationId: origin?.applicationId ?? null,
      })
      .returning({ id: questions.id });

    return { status: "created", id: question.id };
  });
}
