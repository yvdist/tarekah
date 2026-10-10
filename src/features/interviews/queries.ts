import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { interviews } from "@/db/schema";
import { applicationIdSchema } from "@/features/applications/schemas";
import { listInterviewQuestions } from "@/features/questions/data";
import { requireUser } from "@/lib/auth";

export type InterviewListItem = Awaited<
  ReturnType<typeof listInterviewsByApplication>
>[number];

export async function getInterviews(applicationId: string) {
  const user = await requireUser();
  const parsed = applicationIdSchema.safeParse(applicationId);

  return parsed.success
    ? listInterviewsByApplication(user.id, parsed.data)
    : [];
}

// Unexported: taking a userId argument, it must only be reachable through the
// session-resolving function above. The questions of each interview live in
// their own table, hence the second tag.
async function listInterviewsByApplication(
  userId: string,
  applicationId: string,
) {
  "use cache";
  cacheTag(`interviews:${userId}`, `questions:${userId}`);
  cacheLife("hours");

  const rows = await db
    .select({
      id: interviews.id,
      applicationId: interviews.applicationId,
      scheduledAt: interviews.scheduledAt,
      stage: interviews.stage,
      interviewers: interviews.interviewers,
      reflection: interviews.reflection,
    })
    .from(interviews)
    .where(
      and(
        eq(interviews.applicationId, applicationId),
        eq(interviews.userId, userId),
      ),
    )
    .orderBy(desc(interviews.scheduledAt));

  const questions = await listInterviewQuestions(
    db,
    userId,
    rows.map((row) => row.id),
  );

  return rows.map((row) => ({
    ...row,
    questions: questions
      .filter((question) => question.interviewId === row.id)
      .map(({ id, text, readiness }) => ({ id, text, readiness })),
  }));
}
