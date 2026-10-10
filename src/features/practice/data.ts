import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import {
  applications,
  companies,
  interviews,
  practiceSessions,
  practiceTurns,
  questions,
  questionStories,
  stories,
} from "@/db/schema";
import type {
  PracticeInterviewType,
  PracticeLanguage,
  PracticeLevel,
  PracticeTone,
  QuestionCategory,
} from "@/db/schema/enum-values";
import {
  type Database,
  findOwnedApplicationId,
} from "@/features/questions/data";
import type { ApplicationContext } from "./prompts/blocks";
import { normalizeQuestionText } from "./same-question";
import type {
  SimulationSummary,
  StoredFeedback,
  StoredSummary,
  TurnOrigin,
} from "./schemas";
import {
  type ControlKind,
  CONTROL_PHRASES,
  countAnswers,
  isStale,
  nearestInterview,
  nextStep,
} from "./simulation";

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

// The bank as it is compared against: a question the user already has is not
// added again, whichever row holds it.
async function listBankTexts(db: Database, userId: string) {
  const rows = await db
    .select({ id: questions.id, text: questions.text })
    .from(questions)
    .where(eq(questions.userId, userId))
    .orderBy(asc(questions.createdAt), asc(questions.id));

  return rows.map((row) => ({
    id: row.id,
    key: normalizeQuestionText(row.text),
  }));
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
    const existing = await listBankTexts(tx, userId);
    const wanted = normalizeQuestionText(input.text);

    if (existing.some((row) => row.key === wanted)) {
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

// --- Simulation -----------------------------------------------------------

export type SimulationSettingsRow = {
  applicationId: string | null;
  interviewType: PracticeInterviewType;
  level: PracticeLevel;
  tone: PracticeTone;
  language: PracticeLanguage;
  maxTurns: number;
};

// Starts a simulation with nothing said yet. Returns null when the
// application is not the user's.
export async function createSimulationSession(
  db: Database,
  userId: string,
  settings: SimulationSettingsRow,
) {
  if (
    settings.applicationId &&
    !(await findOwnedApplicationId(db, userId, settings.applicationId))
  ) {
    return null;
  }

  const [session] = await db
    .insert(practiceSessions)
    .values({ userId, mode: "simulation", ...settings })
    .returning({ id: practiceSessions.id });

  return { sessionId: session.id };
}

const sessionColumns = {
  id: practiceSessions.id,
  applicationId: practiceSessions.applicationId,
  interviewType: practiceSessions.interviewType,
  level: practiceSessions.level,
  tone: practiceSessions.tone,
  language: practiceSessions.language,
  maxTurns: practiceSessions.maxTurns,
  status: practiceSessions.status,
  startedAt: practiceSessions.startedAt,
  endedAt: practiceSessions.endedAt,
  summary: practiceSessions.summary,
};

export type Simulation = NonNullable<
  Awaited<ReturnType<typeof findSimulation>>
>;

// One simulation with everything said in it, or null when it is not the
// user's simulation. The CHECK on the table guarantees the settings are there;
// a row without them is treated as missing rather than trusted. With `lock`,
// the session row is held until the transaction ends, so two requests cannot
// both write the next turn.
export async function findSimulation(
  db: Database,
  userId: string,
  sessionId: string,
  options: { lock?: boolean } = {},
) {
  const query = db
    .select(sessionColumns)
    .from(practiceSessions)
    .where(
      and(
        eq(practiceSessions.id, sessionId),
        eq(practiceSessions.userId, userId),
        eq(practiceSessions.mode, "simulation"),
      ),
    )
    .limit(1);
  const [session] = await (options.lock ? query.for("update") : query);

  if (
    !session ||
    !session.interviewType ||
    !session.level ||
    !session.tone ||
    !session.maxTurns
  ) {
    return null;
  }

  const turns = await db
    .select({
      id: practiceTurns.id,
      position: practiceTurns.position,
      role: practiceTurns.role,
      content: practiceTurns.content,
      createdAt: practiceTurns.createdAt,
    })
    .from(practiceTurns)
    .where(
      and(
        eq(practiceTurns.sessionId, sessionId),
        eq(practiceTurns.userId, userId),
      ),
    )
    .orderBy(asc(practiceTurns.position));

  return {
    ...session,
    interviewType: session.interviewType,
    level: session.level,
    tone: session.tone,
    maxTurns: session.maxTurns,
    turns,
    lastActivityAt: turns.at(-1)?.createdAt ?? session.startedAt,
  };
}

// The job a simulation prepares for, as the prompts carry it: the position,
// the company with the user's notes on it, the posting, and the stage of the
// nearest interview. Null when the application is gone or not the user's.
export async function findApplicationContext(
  db: Database,
  userId: string,
  applicationId: string,
  now: number,
): Promise<ApplicationContext | null> {
  const [application] = await db
    .select({
      position: applications.position,
      jobDescription: applications.jobDescription,
      companyName: companies.name,
      companyNotes: companies.notes,
    })
    .from(applications)
    .innerJoin(
      companies,
      and(
        eq(companies.id, applications.companyId),
        eq(companies.userId, userId),
      ),
    )
    .where(
      and(eq(applications.id, applicationId), eq(applications.userId, userId)),
    )
    .limit(1);

  if (!application) {
    return null;
  }

  const scheduled = await db
    .select({ scheduledAt: interviews.scheduledAt, stage: interviews.stage })
    .from(interviews)
    .where(
      and(
        eq(interviews.applicationId, applicationId),
        eq(interviews.userId, userId),
      ),
    );

  return {
    ...application,
    stage: nearestInterview(scheduled, now)?.stage ?? null,
  };
}

export type CandidateTurnInput =
  { kind: "answer"; text: string } | { kind: ControlKind };

export type CandidateTurnOutcome =
  | { status: "saved"; turn: { id: string; position: number; content: string } }
  // Not the user's simulation.
  | { status: "not_found" }
  // Over, or left alone for too long.
  | { status: "closed" }
  // The interviewer has not replied to the previous turn yet.
  | { status: "waiting" }
  // Every request to repeat or to think has been used.
  | { status: "no_controls_left" };

// Saves what the candidate said, if it is their turn to speak. The turn limit
// lives here, on the server: once the session is over nothing is accepted,
// whatever the client sends. The text of a request to repeat or to think is
// written here too, in the language of the session.
export async function appendCandidateTurn(
  db: Database,
  userId: string,
  sessionId: string,
  input: CandidateTurnInput,
  now: number,
): Promise<CandidateTurnOutcome> {
  return db.transaction(async (tx) => {
    const session = await findSimulation(tx, userId, sessionId, { lock: true });

    if (!session) {
      return { status: "not_found" };
    }

    if (
      session.status !== "in_progress" ||
      isStale(session.lastActivityAt, now)
    ) {
      return { status: "closed" };
    }

    const step = nextStep(session.maxTurns, session.turns);

    if (step.actor === "none") {
      return { status: "closed" };
    }

    if (step.actor === "interviewer") {
      return { status: "waiting" };
    }

    if (input.kind !== "answer" && step.controlsLeft === 0) {
      return { status: "no_controls_left" };
    }

    const [turn] = await tx
      .insert(practiceTurns)
      .values({
        userId,
        sessionId,
        position: session.turns.length,
        role: "candidate",
        content:
          input.kind === "answer"
            ? input.text
            : CONTROL_PHRASES[session.language][input.kind],
      })
      .returning({
        id: practiceTurns.id,
        position: practiceTurns.position,
        content: practiceTurns.content,
      });

    return { status: "saved", turn };
  });
}

// Saves what the interviewer said at the position it was written for. Returns
// null when the session moved on in the meantime (another request already
// saved this turn) or is over: the text is then dropped rather than written
// twice. With `closes`, the session is completed in the same transaction.
export async function appendInterviewerTurn(
  db: Database,
  userId: string,
  sessionId: string,
  input: {
    position: number;
    content: string;
    origin: TurnOrigin;
    closes: boolean;
  },
) {
  return db.transaction(async (tx) => {
    const session = await findSimulation(tx, userId, sessionId, { lock: true });

    if (
      !session ||
      session.status !== "in_progress" ||
      session.turns.length !== input.position
    ) {
      return null;
    }

    const [turn] = await tx
      .insert(practiceTurns)
      .values({
        userId,
        sessionId,
        position: input.position,
        role: "interviewer",
        content: input.content,
        feedback: input.origin,
      })
      .returning({
        id: practiceTurns.id,
        position: practiceTurns.position,
        content: practiceTurns.content,
      });

    if (input.closes) {
      await tx
        .update(practiceSessions)
        .set({ status: "completed", endedAt: new Date() })
        .where(
          and(
            eq(practiceSessions.id, sessionId),
            eq(practiceSessions.userId, userId),
          ),
        );
    }

    return turn;
  });
}

// Ends a simulation the user chose to stop. One with at least one answer is
// completed, and can be summarized; one with none was never practised and is
// marked abandoned. A session that already ended keeps its status. Returns
// null when it is not the user's simulation.
export async function endSimulation(
  db: Database,
  userId: string,
  sessionId: string,
) {
  return db.transaction(async (tx) => {
    const session = await findSimulation(tx, userId, sessionId, { lock: true });

    if (!session) {
      return null;
    }

    if (session.status !== "in_progress") {
      return { status: session.status };
    }

    const status =
      countAnswers(session.turns) > 0
        ? ("completed" as const)
        : ("abandoned" as const);

    await tx
      .update(practiceSessions)
      .set({ status, endedAt: new Date() })
      .where(
        and(
          eq(practiceSessions.id, sessionId),
          eq(practiceSessions.userId, userId),
        ),
      );

    return { status };
  });
}

// Writes the closing summary once. Returns false when the session is not the
// user's or already has one: the first summary stays.
export async function saveSessionSummary(
  db: Database,
  userId: string,
  sessionId: string,
  summary: StoredSummary,
) {
  const updated = await db
    .update(practiceSessions)
    .set({ summary })
    .where(
      and(
        eq(practiceSessions.id, sessionId),
        eq(practiceSessions.userId, userId),
        eq(practiceSessions.mode, "simulation"),
        isNull(practiceSessions.summary),
      ),
    )
    .returning({ id: practiceSessions.id });

  return updated.length > 0;
}

export type SimulationListItem = Awaited<
  ReturnType<typeof listSimulations>
>[number];

// The user's latest simulations with the job each one was for, newest first.
// `lastActivityAt` is when something was last said, which is what decides
// whether a session still in progress has been left alone.
export async function listSimulations(
  db: Database,
  userId: string,
  limit = 20,
) {
  const lastTurnAt = db
    .select({
      sessionId: practiceTurns.sessionId,
      at: sql<Date>`max(${practiceTurns.createdAt})`
        .mapWith(practiceTurns.createdAt)
        .as("at"),
    })
    .from(practiceTurns)
    .where(eq(practiceTurns.userId, userId))
    .groupBy(practiceTurns.sessionId)
    .as("last_turn");

  const rows = await db
    .select({
      id: practiceSessions.id,
      interviewType: practiceSessions.interviewType,
      language: practiceSessions.language,
      status: practiceSessions.status,
      startedAt: practiceSessions.startedAt,
      lastTurnAt: lastTurnAt.at,
      applicationId: practiceSessions.applicationId,
      position: applications.position,
      companyName: companies.name,
    })
    .from(practiceSessions)
    .leftJoin(lastTurnAt, eq(lastTurnAt.sessionId, practiceSessions.id))
    .leftJoin(
      applications,
      and(
        eq(applications.id, practiceSessions.applicationId),
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
    .where(
      and(
        eq(practiceSessions.userId, userId),
        eq(practiceSessions.mode, "simulation"),
      ),
    )
    .orderBy(desc(practiceSessions.startedAt), desc(practiceSessions.id))
    .limit(limit);

  return rows.flatMap(({ lastTurnAt: at, interviewType, ...row }) =>
    interviewType
      ? [{ ...row, interviewType, lastActivityAt: at ?? row.startedAt }]
      : [],
  );
}

const SUMMARY_STORY_LIMIT = 30;

// The stories a summary may point at: the ones touched most recently, with
// their four parts. Bounded, so a long archive does not swell the request.
export async function listStoriesForSummary(db: Database, userId: string) {
  return db
    .select({
      id: stories.id,
      title: stories.title,
      situation: stories.situation,
      task: stories.task,
      action: stories.action,
      result: stories.result,
    })
    .from(stories)
    .where(eq(stories.userId, userId))
    .orderBy(desc(stories.updatedAt), desc(stories.id))
    .limit(SUMMARY_STORY_LIMIT);
}

// What the screen after a session needs to know about the bank: which of
// these questions the user already has, and which stories each is linked to.
// One entry per text, in the order given.
export async function findQuestionsInBank(
  db: Database,
  userId: string,
  texts: ReadonlyArray<string>,
) {
  const [bank, links] = await Promise.all([
    listBankTexts(db, userId),
    db
      .select({
        questionId: questionStories.questionId,
        storyId: questionStories.storyId,
      })
      .from(questionStories)
      .where(eq(questionStories.userId, userId)),
  ]);

  return texts.map((text) => {
    const key = normalizeQuestionText(text);
    const ids = bank.filter((row) => row.key === key).map((row) => row.id);

    return {
      inBank: ids.length > 0,
      storyIds: links
        .filter((link) => ids.includes(link.questionId))
        .map((link) => link.storyId),
    };
  });
}

export type SummaryView = Awaited<ReturnType<typeof describeSummary>>;

// A summary as the screen after a session shows it: the model's notes, plus
// what only the database knows. Each question says whether the bank has it.
// Each suggestion names the story it points at, if the user still has it, and
// says whether that link is made; one that pointed at no story names the
// story its question has been linked to since, if any.
export async function describeSummary(
  db: Database,
  userId: string,
  summary: SimulationSummary,
) {
  const [extracted, suggested] = await Promise.all([
    findQuestionsInBank(db, userId, summary.extractedQuestions),
    findQuestionsInBank(
      db,
      userId,
      summary.storySuggestions.map(({ question }) => question),
    ),
  ]);
  const storyIds = [
    ...summary.storySuggestions.flatMap(({ storyId }) =>
      storyId ? [storyId] : [],
    ),
    ...suggested.flatMap(({ storyIds: linked }) => linked),
  ];
  const owned =
    storyIds.length > 0
      ? await db
          .select({ id: stories.id, title: stories.title })
          .from(stories)
          .where(and(eq(stories.userId, userId), inArray(stories.id, storyIds)))
      : [];
  const storyOf = (id: string | null | undefined) =>
    owned.find((story) => story.id === id) ?? null;

  return {
    overallStrengths: summary.overallStrengths,
    focusAreas: summary.focusAreas,
    perQuestion: summary.perQuestion,
    questions: summary.extractedQuestions.map((text, index) => ({
      text,
      inBank: extracted[index].inBank,
    })),
    suggestions: summary.storySuggestions.map((item, index) => {
      const linkedIds = suggested[index].storyIds;
      const story = storyOf(item.storyId) ?? storyOf(linkedIds[0]);

      return {
        question: item.question,
        suggestion: item.suggestion,
        story,
        linked: story !== null && linkedIds.includes(story.id),
      };
    }),
  };
}

type SessionQuestionOrigin = {
  category: QuestionCategory;
  // The application the session was for, if any. Checked here: the foreign
  // key does not look at who owns the row.
  applicationId: string | null;
};

// Adds questions from a session to the bank, marked as coming from practice.
// A question the user already has is skipped, and so is one that repeats
// another in the same batch. Returns how many went in and how many did not.
export async function addSessionQuestions(
  db: Database,
  userId: string,
  input: SessionQuestionOrigin & { texts: ReadonlyArray<string> },
) {
  return db.transaction(async (tx) => {
    const known = new Set(
      (await listBankTexts(tx, userId)).map((row) => row.key),
    );
    const applicationId = input.applicationId
      ? await findOwnedApplicationId(tx, userId, input.applicationId)
      : null;
    const fresh: string[] = [];

    for (const text of input.texts) {
      const key = normalizeQuestionText(text);

      if (key !== "" && !known.has(key)) {
        known.add(key);
        fresh.push(text);
      }
    }

    if (fresh.length > 0) {
      await tx.insert(questions).values(
        fresh.map((text) => ({
          userId,
          text,
          source: "ai" as const,
          category: input.category,
          applicationId,
        })),
      );
    }

    return {
      created: fresh.length,
      skipped: input.texts.length - fresh.length,
    };
  });
}

// Links a story to a question from a session. The question is the one already
// in the bank with the same text, or a new one from practice. Refused when the
// story is not the user's. Linking twice changes nothing.
export async function linkStoryToSessionQuestion(
  db: Database,
  userId: string,
  input: SessionQuestionOrigin & { text: string; storyId: string },
): Promise<
  { status: "linked"; questionId: string } | { status: "story_not_found" }
> {
  return db.transaction(async (tx) => {
    const [story] = await tx
      .select({ id: stories.id })
      .from(stories)
      .where(and(eq(stories.id, input.storyId), eq(stories.userId, userId)))
      .limit(1);

    if (!story) {
      return { status: "story_not_found" };
    }

    const key = normalizeQuestionText(input.text);
    const existing = (await listBankTexts(tx, userId)).find(
      (row) => row.key === key,
    );
    let questionId = existing?.id;

    if (!questionId) {
      const [created] = await tx
        .insert(questions)
        .values({
          userId,
          text: input.text,
          source: "ai",
          category: input.category,
          applicationId: input.applicationId
            ? await findOwnedApplicationId(tx, userId, input.applicationId)
            : null,
        })
        .returning({ id: questions.id });

      questionId = created.id;
    }

    await tx
      .insert(questionStories)
      .values({ userId, questionId, storyId: story.id })
      .onConflictDoNothing();

    return { status: "linked", questionId };
  });
}
