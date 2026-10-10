import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { summarizeReadiness } from "@/features/questions/filter";
import { getQuestions } from "@/features/questions/queries";
import { questionCategorySchema } from "@/features/questions/schemas";
import { requireUser } from "@/lib/auth";
import { findPracticeQuestion, type PracticeQuestion } from "./data";
import { groupSameQuestions } from "./same-question";

export type { PracticeQuestion };

// The bank as it is practised: a question asked in several interviews is
// several rows there and one question here. The summary and the total count
// questions, not rows, and the category (from the URL, so untrusted) is that
// of the row standing for each group.
export async function getPracticeQuestions(category?: string) {
  const { matches: rows } = await getQuestions({});
  const all = groupSameQuestions(rows);
  const wanted = questionCategorySchema
    .or(z.literal(""))
    .catch("")
    .parse(category ?? "");

  return {
    total: all.length,
    summary: summarizeReadiness(all),
    matches:
      wanted === "" ? all : all.filter((item) => item.category === wanted),
    category: wanted,
  };
}

// The question being practised, with its linked stories. A row that does not
// exist or belongs to someone else is a 404 either way.
export async function getPracticeQuestion(id: string) {
  const user = await requireUser();
  const parsed = z.uuid().safeParse(id);

  if (!parsed.success) {
    notFound();
  }

  const question = await findPracticeQuestionByUserId(user.id, parsed.data);

  if (!question) {
    notFound();
  }

  return question;
}

// Unexported: taking a userId argument, it must only be reachable through the
// session-resolving function above.
async function findPracticeQuestionByUserId(userId: string, id: string) {
  "use cache";
  cacheTag(`questions:${userId}`, `stories:${userId}`);
  cacheLife("hours");

  return findPracticeQuestion(db, userId, id);
}
