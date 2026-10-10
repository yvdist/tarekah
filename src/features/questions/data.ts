import { and, asc, desc, eq, inArray, notInArray } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type * as schema from "@/db/schema";
import {
  applications,
  companies,
  interviews,
  questions,
  questionStories,
  stories,
} from "@/db/schema";
import type { InterviewQuestionRow } from "./schemas";

// The SQL of the question bank. The database is passed in rather than
// imported, so the same statements run against the pool in queries.ts and
// actions.ts and against an in-memory Postgres in tests. Callers own
// authorization and caching.
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

export type QuestionListItem = Awaited<
  ReturnType<typeof listQuestions>
>[number];

// Every question of one user with where it came from and the stories it is
// linked to, newest first.
export async function listQuestions(db: Database, userId: string) {
  const [rows, links] = await Promise.all([
    db
      .select({
        id: questions.id,
        text: questions.text,
        category: questions.category,
        source: questions.source,
        readiness: questions.readiness,
        notes: questions.notes,
        interviewId: questions.interviewId,
        applicationId: questions.applicationId,
        stage: interviews.stage,
        scheduledAt: interviews.scheduledAt,
        position: applications.position,
        companyName: companies.name,
        createdAt: questions.createdAt,
      })
      .from(questions)
      .leftJoin(
        interviews,
        and(
          eq(interviews.id, questions.interviewId),
          eq(interviews.userId, userId),
        ),
      )
      .leftJoin(
        applications,
        and(
          eq(applications.id, questions.applicationId),
          eq(applications.userId, userId),
        ),
      )
      .leftJoin(
        companies,
        and(
          eq(companies.id, applications.companyId),
          eq(companies.userId, userId),
        ),
      )
      .where(eq(questions.userId, userId))
      .orderBy(desc(questions.createdAt), desc(questions.id)),
    db
      .select({
        questionId: questionStories.questionId,
        id: stories.id,
        title: stories.title,
      })
      .from(questionStories)
      .innerJoin(
        stories,
        and(
          eq(stories.id, questionStories.storyId),
          eq(stories.userId, userId),
        ),
      )
      .where(eq(questionStories.userId, userId))
      .orderBy(asc(stories.title)),
  ]);

  return rows.map((row) => ({
    ...row,
    stories: links
      .filter((link) => link.questionId === row.id)
      .map(({ id, title }) => ({ id, title })),
  }));
}

// Questions of one interview, in the order they were written, for the list
// editor and the interview card.
export async function listInterviewQuestions(
  db: Database,
  userId: string,
  interviewIds: string[],
) {
  if (interviewIds.length === 0) {
    return [];
  }

  return db
    .select({
      id: questions.id,
      interviewId: questions.interviewId,
      text: questions.text,
      readiness: questions.readiness,
    })
    .from(questions)
    .where(
      and(
        eq(questions.userId, userId),
        inArray(questions.interviewId, interviewIds),
      ),
    )
    .orderBy(asc(questions.createdAt), asc(questions.id));
}

// The foreign keys do not check ownership, so every id is checked here.
export async function findOwnedStoryIds(
  db: Database,
  userId: string,
  ids: string[],
) {
  if (ids.length === 0) {
    return [];
  }

  const rows = await db
    .select({ id: stories.id })
    .from(stories)
    .where(and(eq(stories.userId, userId), inArray(stories.id, ids)));

  return rows.map((row) => row.id);
}

export async function findOwnedApplicationId(
  db: Database,
  userId: string,
  id: string,
) {
  const [row] = await db
    .select({ id: applications.id })
    .from(applications)
    .where(and(eq(applications.id, id), eq(applications.userId, userId)))
    .limit(1);

  return row?.id ?? null;
}

// Makes the questions of one interview match the rows of the list editor: a
// row with an id updates that question (its readiness, notes and story links
// stay), a row without one is inserted, and a question whose id is no longer
// listed is deleted. Ids that are not this user's questions of this interview
// are ignored, so a forged id cannot touch anything else. Returns the number
// of rows that were not found.
export async function syncInterviewQuestions(
  db: Database,
  userId: string,
  interview: { id: string; applicationId: string },
  rows: InterviewQuestionRow[],
) {
  const scope = and(
    eq(questions.userId, userId),
    eq(questions.interviewId, interview.id),
  );
  const keptIds = rows.flatMap((row) => (row.id ? [row.id] : []));

  await db
    .delete(questions)
    .where(
      and(
        scope,
        keptIds.length > 0 ? notInArray(questions.id, keptIds) : undefined,
      ),
    );

  let missing = 0;

  for (const row of rows) {
    if (!row.id) {
      continue;
    }

    const updated = await db
      .update(questions)
      .set({ text: row.text, applicationId: interview.applicationId })
      .where(and(scope, eq(questions.id, row.id)))
      .returning({ id: questions.id });

    if (updated.length === 0) {
      missing += 1;
    }
  }

  const fresh = rows.filter((row) => !row.id).map(({ text }) => ({ text }));

  if (fresh.length > 0) {
    await db.insert(questions).values(
      withOrder(fresh, Date.now()).map((row) => ({
        ...row,
        userId,
        interviewId: interview.id,
        applicationId: interview.applicationId,
        source: "interview" as const,
      })),
    );
  }

  return { missing };
}

// Rows inserted in one statement share now(), so the order they were written
// in is kept by spacing created_at one millisecond apart.
export function withOrder<T>(rows: T[], from: number) {
  return rows.map((row, index) => ({
    ...row,
    createdAt: new Date(from + index),
  }));
}
