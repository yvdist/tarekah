import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { requireUser } from "@/lib/auth";
import { listQuestions, type QuestionListItem } from "./data";
import { filterQuestions, summarizeReadiness } from "./filter";
import { questionFilterSchema } from "./schemas";

export type { QuestionListItem };

// Every question of the user, filtered in memory after the cached read. The
// filter values come from the URL, so they are parsed as untrusted; the
// summary counts everything, not just the matches.
export async function getQuestions(filter: Record<string, string | undefined>) {
  const user = await requireUser();
  const all = await listQuestionsByUserId(user.id);
  const parsed = questionFilterSchema.parse(filter);

  return {
    total: all.length,
    summary: summarizeReadiness(all),
    matches: filterQuestions(all, parsed),
    filter: parsed,
  };
}

// Unexported: taking a userId argument, it must only be reachable through the
// session-resolving function above. The rows show their interview, application,
// company and stories, hence the extra tags.
async function listQuestionsByUserId(userId: string) {
  "use cache";
  cacheTag(
    `questions:${userId}`,
    `interviews:${userId}`,
    `applications:${userId}`,
    `companies:${userId}`,
    `stories:${userId}`,
  );
  cacheLife("hours");

  return listQuestions(db, userId);
}
