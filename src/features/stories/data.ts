import { and, asc, count, desc, eq } from "drizzle-orm";
import { questions, questionStories, stories } from "@/db/schema";
import type { Database } from "@/features/questions/data";
import type { StoryFilter } from "./schemas";

export type StoryListItem = Awaited<ReturnType<typeof listStories>>[number];

// Every story of one user with how many questions point at it, newest first.
export async function listStories(db: Database, userId: string) {
  const [rows, counts] = await Promise.all([
    db
      .select({
        id: stories.id,
        title: stories.title,
        situation: stories.situation,
        task: stories.task,
        action: stories.action,
        result: stories.result,
        competencies: stories.competencies,
        updatedAt: stories.updatedAt,
      })
      .from(stories)
      .where(eq(stories.userId, userId))
      .orderBy(desc(stories.updatedAt), desc(stories.id)),
    db
      .select({ storyId: questionStories.storyId, total: count() })
      .from(questionStories)
      .where(eq(questionStories.userId, userId))
      .groupBy(questionStories.storyId),
  ]);

  const totals = new Map(counts.map((row) => [row.storyId, row.total]));

  return rows.map((row) => ({
    ...row,
    questionCount: totals.get(row.id) ?? 0,
  }));
}

// One story with the questions linked to it, or null when it does not exist
// or belongs to someone else.
export async function findStory(db: Database, userId: string, id: string) {
  const [story] = await db
    .select()
    .from(stories)
    .where(and(eq(stories.id, id), eq(stories.userId, userId)))
    .limit(1);

  if (!story) {
    return null;
  }

  const linked = await db
    .select({
      id: questions.id,
      text: questions.text,
      category: questions.category,
      readiness: questions.readiness,
    })
    .from(questionStories)
    .innerJoin(
      questions,
      and(
        eq(questions.id, questionStories.questionId),
        eq(questions.userId, userId),
      ),
    )
    .where(
      and(
        eq(questionStories.storyId, story.id),
        eq(questionStories.userId, userId),
      ),
    )
    .orderBy(asc(questions.createdAt), asc(questions.id));

  return { ...story, questions: linked };
}

// Runs in memory after the cached read, like the other list pages.
export function filterStories<T extends StoryListItem>(
  items: T[],
  filter: StoryFilter,
): T[] {
  const keyword = filter.q.trim().toLowerCase();

  return items.filter(
    (item) =>
      (filter.competency === "" ||
        item.competencies.includes(filter.competency)) &&
      (keyword === "" ||
        [
          item.title,
          item.situation ?? "",
          item.task ?? "",
          item.action ?? "",
          item.result ?? "",
        ].some((text) => text.toLowerCase().includes(keyword))),
  );
}
