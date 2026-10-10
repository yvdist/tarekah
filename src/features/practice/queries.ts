import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { requireUser } from "@/lib/auth";
import { findPracticeQuestion, type PracticeQuestion } from "./data";

export type { PracticeQuestion };

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
