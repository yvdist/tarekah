import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import type { ApplicationStatus } from "@/db/schema/enum-values";
import { getAiStatus } from "@/features/ai/queries";
import { getApplicationOptions } from "@/features/applications/queries";
import { getInterviews } from "@/features/interviews/queries";
import { summarizeReadiness } from "@/features/questions/filter";
import { getQuestions } from "@/features/questions/queries";
import { questionCategorySchema } from "@/features/questions/schemas";
import { requireUser } from "@/lib/auth";
import {
  describeSummary,
  findApplicationContext,
  findPracticeQuestion,
  findSimulation,
  listSimulations,
  type PracticeQuestion,
} from "./data";
import { groupSameQuestions } from "./same-question";
import { type SimulationSettingsInput, storedSummarySchema } from "./schemas";
import {
  durationOf,
  effectiveStatus,
  shouldOfferPractice,
  suggestSettings,
} from "./simulation";

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

export type PracticeHistoryItem = Awaited<
  ReturnType<typeof getPracticeHistory>
>[number];

// The user's latest simulations. Whether one still in progress has been left
// alone depends on the clock, so that is worked out here, at request time and
// outside the cached list.
export async function getPracticeHistory() {
  const user = await requireUser();
  const rows = await listSimulationsByUserId(user.id);

  await connection();

  const now = Date.now();

  return rows.map(({ lastActivityAt, ...row }) => ({
    ...row,
    status: effectiveStatus({ status: row.status, lastActivityAt }, now),
  }));
}

// Unexported, for the same reason as above. A session shows the job it was
// for, hence the other two tags.
async function listSimulationsByUserId(userId: string) {
  "use cache";
  cacheTag(
    `practice:${userId}`,
    `applications:${userId}`,
    `companies:${userId}`,
  );
  cacheLife("hours");

  return listSimulations(db, userId);
}

export type SimulationDetail = Awaited<ReturnType<typeof getSimulation>>;

// One simulation as its page shows it. Read straight from the database: the
// interviewer's turns are saved while a reply streams, outside any action
// that could update a tag. A session that does not exist or belongs to
// someone else is a 404 either way.
export async function getSimulation(sessionId: string) {
  const user = await requireUser();
  const parsed = z.uuid().safeParse(sessionId);
  const session = parsed.success
    ? await findSimulation(db, user.id, parsed.data)
    : null;

  if (!session) {
    notFound();
  }

  await connection();

  const now = Date.now();
  const stored = storedSummarySchema.safeParse(session.summary);
  const [application, summary] = await Promise.all([
    session.applicationId
      ? findApplicationContext(db, user.id, session.applicationId, now)
      : null,
    stored.success ? describeSummary(db, user.id, stored.data.result) : null,
  ]);

  return {
    id: session.id,
    interviewType: session.interviewType,
    level: session.level,
    tone: session.tone,
    language: session.language,
    maxTurns: session.maxTurns,
    duration: durationOf(session.maxTurns),
    startedAt: session.startedAt,
    // What is stored, and what it reads as now: a session in progress that
    // was left alone shows as abandoned but can still be ended for a summary.
    stored: session.status,
    status: effectiveStatus(session, now),
    application:
      application && session.applicationId
        ? {
            id: session.applicationId,
            position: application.position,
            companyName: application.companyName,
          }
        : null,
    turns: session.turns.flatMap(({ id, position, role, content }) =>
      role === "system_event" ? [] : [{ id, position, role, content }],
    ),
    summary,
  };
}

const DEFAULT_SETTINGS = {
  interviewType: "behavioral",
  level: "mid",
  language: "id",
} as const;

// What the settings form of a new simulation starts with. An application
// named in the URL (so untrusted) fills in what it suggests; one that is not
// the user's is ignored.
export async function getSimulationSetup(applicationId?: string) {
  const user = await requireUser();
  const [applications, ai] = await Promise.all([
    getApplicationOptions(),
    getAiStatus(),
  ]);
  const chosen = applications.find(({ id }) => id === applicationId);

  await connection();

  const application = chosen
    ? await findApplicationContext(db, user.id, chosen.id, Date.now())
    : null;
  const defaults: SimulationSettingsInput = {
    applicationId: application && chosen ? chosen.id : "",
    ...(application ? suggestSettings(application) : DEFAULT_SETTINGS),
    tone: "friendly",
    duration: "15",
  };

  return { aiReady: ai.ready, applications, defaults };
}

// Whether the page of an application offers to practise for it: it is at the
// interview stage, or an interview is still to come.
export async function getPracticeOffer(application: {
  id: string;
  status: ApplicationStatus;
}) {
  const interviews = await getInterviews(application.id);

  await connection();

  return shouldOfferPractice(application.status, interviews, Date.now());
}
