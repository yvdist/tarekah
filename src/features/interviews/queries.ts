import "server-only";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { applications, companies, interviews } from "@/db/schema";
import { applicationIdSchema } from "@/features/applications/schemas";
import { requireUser } from "@/lib/auth";
import { splitQuestions } from "./questions";
import { interviewStageSchema } from "./schemas";

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

// Every question from every interview as its own entry, newest interview
// first. Search values come from the URL, so they are treated as untrusted
// and applied here, after the cached read.
export async function getQuestions(filter: { q?: string; stage?: string }) {
  const user = await requireUser();
  const sources = await listQuestionSourcesByUserId(user.id);
  const stage = interviewStageSchema.safeParse(filter.stage);
  const keyword = filter.q?.trim().toLowerCase() ?? "";

  const all = sources.flatMap(({ questions, ...source }) =>
    splitQuestions(questions ?? "").map((question, index) => ({
      ...source,
      key: `${source.interviewId}:${index}`,
      question,
    })),
  );

  const matches = all.filter(
    (item) =>
      (!stage.success || item.stage === stage.data) &&
      (keyword === "" ||
        [item.question, item.companyName, item.position].some((text) =>
          text.toLowerCase().includes(keyword),
        )),
  );

  return { total: all.length, matches };
}

// The cached functions below stay unexported: taking a userId argument, they
// must only be reachable through the session-resolving functions above.

async function listInterviewsByApplication(
  userId: string,
  applicationId: string,
) {
  "use cache";
  cacheTag(`interviews:${userId}`);
  cacheLife("hours");

  return db
    .select({
      id: interviews.id,
      applicationId: interviews.applicationId,
      scheduledAt: interviews.scheduledAt,
      stage: interviews.stage,
      interviewers: interviews.interviewers,
      questions: interviews.questions,
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
}

// Shows the company and position too, hence the extra tags.
async function listQuestionSourcesByUserId(userId: string) {
  "use cache";
  cacheTag(
    `interviews:${userId}`,
    `applications:${userId}`,
    `companies:${userId}`,
  );
  cacheLife("hours");

  return db
    .select({
      interviewId: interviews.id,
      applicationId: applications.id,
      companyName: companies.name,
      position: applications.position,
      stage: interviews.stage,
      scheduledAt: interviews.scheduledAt,
      questions: interviews.questions,
    })
    .from(interviews)
    .innerJoin(
      applications,
      and(
        eq(applications.id, interviews.applicationId),
        eq(applications.userId, userId),
      ),
    )
    .innerJoin(
      companies,
      and(
        eq(companies.id, applications.companyId),
        eq(companies.userId, userId),
      ),
    )
    .where(and(eq(interviews.userId, userId), isNotNull(interviews.questions)))
    .orderBy(desc(interviews.scheduledAt));
}
