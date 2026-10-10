import { asc, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  applications,
  companies,
  practiceSessions,
  practiceTurns,
  questions,
  questionStories,
  stories,
} from "@/db/schema";
import {
  createApplication,
  createInterview,
  createStory,
  createTestDb,
  createUser,
  type TestDb,
} from "@/test/db";
import {
  addFollowUpQuestion,
  addSessionQuestions,
  appendCandidateTurn,
  appendInterviewerTurn,
  createDrillSession,
  createSimulationSession,
  describeSummary,
  endSimulation,
  findApplicationContext,
  findDrillSession,
  findPracticeQuestion,
  findQuestionsInBank,
  findSimulation,
  linkStoryToSessionQuestion,
  listSimulations,
  listStoriesForSummary,
  saveSessionSummary,
  saveTurnFeedback,
  type SimulationSettingsRow,
} from "./data";
import type { StoredFeedback, StoredSummary } from "./schemas";
import {
  ABANDON_AFTER_HOURS,
  CONTROL_LIMIT,
  CONTROL_PHRASES,
} from "./simulation";

let db: TestDb;
let close: () => Promise<void>;
let userCount = 0;

beforeAll(async () => ({ db, close } = await createTestDb()));
afterAll(() => close());

const newUser = () => createUser(db, `practice-${++userCount}`);

async function newQuestion(
  userId: string,
  values: Partial<typeof questions.$inferInsert> = {},
) {
  const [question] = await db
    .insert(questions)
    .values({
      userId,
      source: "manual",
      text: "Ceritakan proyek tersulitmu.",
      ...values,
    })
    .returning({ id: questions.id });

  return question.id;
}

const feedback: StoredFeedback = {
  promptVersion: "drill-feedback-v1",
  provider: "anthropic",
  model: "claude-sonnet-5-5",
  result: {
    strengths: ["Runtut."],
    improvements: [{ aspect: "structure", note: "Mulai dari hasilnya." }],
    improvedAnswer: "Versi yang lebih rapi.",
    followUpQuestion: "Apa yang kamu pelajari?",
  },
};

const answer = (questionId: string) => ({
  questionId,
  answer: "Saya memimpin migrasi.",
  language: "id" as const,
});

describe("findPracticeQuestion", () => {
  it("returns the question with its linked stories in full", async () => {
    const userId = await newUser();
    const questionId = await newQuestion(userId, { category: "behavioral" });
    const linked = await createStory(db, userId, "Migrasi monolith");

    await createStory(db, userId, "Cerita lain");
    await db
      .update(stories)
      .set({ situation: "Sistem lama lambat.", action: "Strangler pattern." })
      .where(eq(stories.id, linked));
    await db
      .insert(questionStories)
      .values({ userId, questionId, storyId: linked });

    expect(await findPracticeQuestion(db, userId, questionId)).toEqual({
      id: questionId,
      text: "Ceritakan proyek tersulitmu.",
      category: "behavioral",
      readiness: "not_ready",
      stories: [
        {
          id: linked,
          title: "Migrasi monolith",
          situation: "Sistem lama lambat.",
          task: null,
          action: "Strangler pattern.",
          result: null,
        },
      ],
    });
  });

  it("is null for another user's question", async () => {
    const [mine, theirs] = [await newUser(), await newUser()];
    const questionId = await newQuestion(theirs);

    expect(await findPracticeQuestion(db, mine, questionId)).toBeNull();
  });
});

describe("createDrillSession", () => {
  it("saves a completed drill with the question and the answer as turns", async () => {
    const userId = await newUser();
    const applicationId = await createApplication(db, userId, {
      events: [["interview", "2026-09-20"]],
    });
    const questionId = await newQuestion(userId, { applicationId });

    const created = await createDrillSession(db, userId, {
      ...answer(questionId),
      language: "en",
    });

    if (!created) {
      expect.unreachable();
    }

    const [session] = await db
      .select()
      .from(practiceSessions)
      .where(eq(practiceSessions.id, created.sessionId));

    expect(session).toMatchObject({
      userId,
      applicationId,
      mode: "drill",
      status: "completed",
      language: "en",
      interviewType: null,
      level: null,
      tone: null,
      maxTurns: null,
      summary: null,
    });
    expect(session.endedAt).toBeInstanceOf(Date);

    const turns = await db
      .select()
      .from(practiceTurns)
      .where(eq(practiceTurns.sessionId, created.sessionId))
      .orderBy(asc(practiceTurns.position));

    expect(turns).toMatchObject([
      {
        userId,
        position: 0,
        role: "interviewer",
        content: "Ceritakan proyek tersulitmu.",
        questionId,
        feedback: null,
      },
      {
        userId,
        position: 1,
        role: "candidate",
        content: "Saya memimpin migrasi.",
        questionId,
        feedback: null,
      },
    ]);
  });

  it("saves nothing for another user's question", async () => {
    const [mine, theirs] = [await newUser(), await newUser()];
    const questionId = await newQuestion(theirs);

    expect(await createDrillSession(db, mine, answer(questionId))).toBeNull();
    expect(
      await db
        .select()
        .from(practiceSessions)
        .where(eq(practiceSessions.userId, mine)),
    ).toEqual([]);
  });

  it("keeps each attempt as its own session", async () => {
    const userId = await newUser();
    const questionId = await newQuestion(userId);
    const first = await createDrillSession(db, userId, answer(questionId));
    const second = await createDrillSession(db, userId, answer(questionId));

    expect(first?.sessionId).not.toBe(second?.sessionId);
  });
});

describe("findDrillSession and saveTurnFeedback", () => {
  it("reads a drill back, then with the feedback written onto the answer", async () => {
    const userId = await newUser();
    const questionId = await newQuestion(userId);
    const created = await createDrillSession(db, userId, answer(questionId));

    if (!created) {
      expect.unreachable();
    }

    const session = await findDrillSession(db, userId, created.sessionId);

    expect(session).toMatchObject({
      id: created.sessionId,
      language: "id",
      questionId,
      question: "Ceritakan proyek tersulitmu.",
      answer: "Saya memimpin migrasi.",
      feedback: null,
    });

    if (!session) {
      expect.unreachable();
    }

    expect(
      await saveTurnFeedback(db, userId, session.answerTurnId, feedback),
    ).toBe(true);
    expect(
      (await findDrillSession(db, userId, created.sessionId))?.feedback,
    ).toEqual(feedback);

    // Only the candidate's turn carries feedback.
    const [asked] = await db
      .select({ feedback: practiceTurns.feedback })
      .from(practiceTurns)
      .where(eq(practiceTurns.sessionId, created.sessionId))
      .orderBy(asc(practiceTurns.position));

    expect(asked.feedback).toBeNull();
  });

  it("keeps the question as it read when it is edited or deleted later", async () => {
    const userId = await newUser();
    const questionId = await newQuestion(userId);
    const created = await createDrillSession(db, userId, answer(questionId));

    await db.delete(questions).where(eq(questions.id, questionId));

    expect(
      await findDrillSession(db, userId, created?.sessionId ?? ""),
    ).toMatchObject({
      questionId: null,
      question: "Ceritakan proyek tersulitmu.",
    });
  });

  it("hides another user's drill and refuses to write feedback onto it", async () => {
    const [mine, theirs] = [await newUser(), await newUser()];
    const questionId = await newQuestion(theirs);
    const created = await createDrillSession(db, theirs, answer(questionId));

    if (!created) {
      expect.unreachable();
    }

    const session = await findDrillSession(db, theirs, created.sessionId);

    if (!session) {
      expect.unreachable();
    }

    expect(await findDrillSession(db, mine, created.sessionId)).toBeNull();
    expect(
      await saveTurnFeedback(db, mine, session.answerTurnId, feedback),
    ).toBe(false);
    expect(
      (await findDrillSession(db, theirs, created.sessionId))?.feedback,
    ).toBeNull();
  });

  it("does not write feedback onto the interviewer's turn", async () => {
    const userId = await newUser();
    const questionId = await newQuestion(userId);
    const created = await createDrillSession(db, userId, answer(questionId));
    const [asked] = await db
      .select({ id: practiceTurns.id })
      .from(practiceTurns)
      .where(eq(practiceTurns.sessionId, created?.sessionId ?? ""))
      .orderBy(asc(practiceTurns.position));

    expect(await saveTurnFeedback(db, userId, asked.id, feedback)).toBe(false);
  });
});

describe("addFollowUpQuestion", () => {
  it("adds the question with the category and application of the one it follows", async () => {
    const userId = await newUser();
    const applicationId = await createApplication(db, userId, {
      events: [["interview", "2026-09-20"]],
    });
    const originQuestionId = await newQuestion(userId, {
      applicationId,
      category: "behavioral",
      readiness: "ready",
    });

    const added = await addFollowUpQuestion(db, userId, {
      text: "Apa yang kamu pelajari?",
      originQuestionId,
    });

    if (added.status !== "created") {
      expect.unreachable();
    }

    const [question] = await db
      .select()
      .from(questions)
      .where(eq(questions.id, added.id));

    expect(question).toMatchObject({
      userId,
      text: "Apa yang kamu pelajari?",
      source: "ai",
      category: "behavioral",
      applicationId,
      // A new question starts over, whatever the one before it was.
      readiness: "not_ready",
      interviewId: null,
    });
  });

  it("refuses a question the user already has, however it is spelled", async () => {
    const userId = await newUser();
    const originQuestionId = await newQuestion(userId, {
      text: "Apa yang kamu pelajari?",
    });

    expect(
      await addFollowUpQuestion(db, userId, {
        text: "  apa yang   KAMU pelajari ",
        originQuestionId,
      }),
    ).toEqual({ status: "duplicate" });
    expect(
      await db.select().from(questions).where(eq(questions.userId, userId)),
    ).toHaveLength(1);
  });

  it("does not count another user's questions as duplicates", async () => {
    const [mine, theirs] = [await newUser(), await newUser()];

    await newQuestion(theirs, { text: "Apa yang kamu pelajari?" });

    expect(
      await addFollowUpQuestion(db, mine, {
        text: "Apa yang kamu pelajari?",
        originQuestionId: null,
      }),
    ).toMatchObject({ status: "created" });
  });

  it("falls back to no category and no application without an origin of the user's own", async () => {
    const [mine, theirs] = [await newUser(), await newUser()];
    const applicationId = await createApplication(db, theirs, {
      events: [["interview", "2026-09-20"]],
    });
    const foreign = await newQuestion(theirs, {
      applicationId,
      category: "system_design",
    });

    for (const [text, originQuestionId] of [
      ["Pertanyaan tanpa asal?", null],
      ["Pertanyaan dengan asal orang lain?", foreign],
    ] as const) {
      const added = await addFollowUpQuestion(db, mine, {
        text,
        originQuestionId,
      });

      if (added.status !== "created") {
        expect.unreachable();
      }

      const [question] = await db
        .select()
        .from(questions)
        .where(eq(questions.id, added.id));

      expect(question).toMatchObject({
        userId: mine,
        category: "other",
        applicationId: null,
      });
    }
  });
});

const NOW = Date.parse("2026-10-10T12:00:00Z");

const settings: SimulationSettingsRow = {
  applicationId: null,
  interviewType: "behavioral",
  level: "mid",
  tone: "friendly",
  language: "id",
  maxTurns: 6,
};

const origin = {
  promptVersion: "interviewer-v1",
  provider: "deepseek",
  model: "deepseek-flash",
} as const;

async function newSimulation(
  userId: string,
  overrides: Partial<SimulationSettingsRow> = {},
) {
  const created = await createSimulationSession(db, userId, {
    ...settings,
    ...overrides,
  });

  if (!created) {
    throw new Error("The simulation was not created");
  }

  return created.sessionId;
}

// The interviewer speaks at the next free position.
async function ask(userId: string, sessionId: string, closes = false) {
  const session = await findSimulation(db, userId, sessionId);

  return appendInterviewerTurn(db, userId, sessionId, {
    position: session?.turns.length ?? 0,
    content: "Pertanyaan berikutnya?",
    origin,
    closes,
  });
}

const say = (userId: string, sessionId: string, text = "Jawaban saya.") =>
  appendCandidateTurn(db, userId, sessionId, { kind: "answer", text }, NOW);

const sessionRow = async (sessionId: string) =>
  (
    await db
      .select()
      .from(practiceSessions)
      .where(eq(practiceSessions.id, sessionId))
  )[0];

describe("createSimulationSession", () => {
  it("starts a simulation in progress with nothing said", async () => {
    const userId = await newUser();
    const applicationId = await createApplication(db, userId, {
      events: [["interview", "2026-10-01"]],
    });
    const sessionId = await newSimulation(userId, { applicationId });

    expect(await findSimulation(db, userId, sessionId)).toMatchObject({
      id: sessionId,
      applicationId,
      interviewType: "behavioral",
      level: "mid",
      tone: "friendly",
      language: "id",
      maxTurns: 6,
      status: "in_progress",
      endedAt: null,
      summary: null,
      turns: [],
    });
  });

  it("refuses an application of another user", async () => {
    const userId = await newUser();
    const applicationId = await createApplication(db, await newUser(), {
      events: [["interview", "2026-10-01"]],
    });

    expect(
      await createSimulationSession(db, userId, { ...settings, applicationId }),
    ).toBeNull();
  });
});

describe("findSimulation", () => {
  it("hides a simulation from another user", async () => {
    const sessionId = await newSimulation(await newUser());

    expect(await findSimulation(db, await newUser(), sessionId)).toBeNull();
  });

  it("does not read a drill as a simulation", async () => {
    const userId = await newUser();
    const drill = await createDrillSession(
      db,
      userId,
      answer(await newQuestion(userId)),
    );

    expect(await findSimulation(db, userId, drill?.sessionId ?? "")).toBeNull();
  });

  it("dates the last activity from the last turn, or from the start", async () => {
    const userId = await newUser();
    const sessionId = await newSimulation(userId);
    const fresh = await findSimulation(db, userId, sessionId);

    expect(fresh?.lastActivityAt).toEqual(fresh?.startedAt);

    await ask(userId, sessionId);

    const asked = await findSimulation(db, userId, sessionId);

    expect(asked?.lastActivityAt).toEqual(asked?.turns[0].createdAt);
  });
});

describe("appendCandidateTurn", () => {
  it("waits for the interviewer to open", async () => {
    const userId = await newUser();

    expect(await say(userId, await newSimulation(userId))).toEqual({
      status: "waiting",
    });
  });

  it("saves an answer after a question, and then waits again", async () => {
    const userId = await newUser();
    const sessionId = await newSimulation(userId);

    await ask(userId, sessionId);

    expect(await say(userId, sessionId, "Saya memimpin migrasi.")).toEqual({
      status: "saved",
      turn: {
        id: expect.any(String),
        position: 1,
        content: "Saya memimpin migrasi.",
      },
    });
    expect(await say(userId, sessionId)).toEqual({ status: "waiting" });
  });

  it("writes a request to repeat in the language of the session", async () => {
    const userId = await newUser();
    const sessionId = await newSimulation(userId, { language: "en" });

    await ask(userId, sessionId);

    expect(
      await appendCandidateTurn(db, userId, sessionId, { kind: "repeat" }, NOW),
    ).toMatchObject({
      status: "saved",
      turn: { content: CONTROL_PHRASES.en.repeat },
    });
  });

  it("stops taking requests once they are used up", async () => {
    const userId = await newUser();
    const sessionId = await newSimulation(userId);

    for (let used = 0; used < CONTROL_LIMIT; used += 1) {
      await ask(userId, sessionId);
      expect(
        await appendCandidateTurn(
          db,
          userId,
          sessionId,
          { kind: "think" },
          NOW,
        ),
      ).toMatchObject({ status: "saved" });
    }

    await ask(userId, sessionId);

    expect(
      await appendCandidateTurn(db, userId, sessionId, { kind: "think" }, NOW),
    ).toEqual({ status: "no_controls_left" });
    expect(await say(userId, sessionId)).toMatchObject({ status: "saved" });
  });

  it("accepts no more answers than the session allows", async () => {
    const userId = await newUser();
    const sessionId = await newSimulation(userId, { maxTurns: 2 });

    await ask(userId, sessionId);
    expect(await say(userId, sessionId)).toMatchObject({ status: "saved" });
    await ask(userId, sessionId);
    expect(await say(userId, sessionId)).toMatchObject({ status: "saved" });
    expect(await say(userId, sessionId)).toEqual({ status: "waiting" });

    await ask(userId, sessionId, true);

    expect(await say(userId, sessionId)).toEqual({ status: "closed" });
    expect((await findSimulation(db, userId, sessionId))?.turns).toHaveLength(
      5,
    );
  });

  it("refuses a session that was left alone", async () => {
    const userId = await newUser();
    const sessionId = await newSimulation(userId);

    await ask(userId, sessionId);

    const later = Date.now() + (ABANDON_AFTER_HOURS + 1) * 60 * 60 * 1000;

    expect(
      await appendCandidateTurn(
        db,
        userId,
        sessionId,
        { kind: "answer", text: "Terlambat." },
        later,
      ),
    ).toEqual({ status: "closed" });
  });

  it("refuses a session that ended", async () => {
    const userId = await newUser();
    const sessionId = await newSimulation(userId);

    await ask(userId, sessionId);
    await endSimulation(db, userId, sessionId);

    expect(await say(userId, sessionId)).toEqual({ status: "closed" });
  });

  it("does not write into another user's session", async () => {
    const owner = await newUser();
    const sessionId = await newSimulation(owner);

    await ask(owner, sessionId);

    expect(await say(await newUser(), sessionId)).toEqual({
      status: "not_found",
    });
    expect((await findSimulation(db, owner, sessionId))?.turns).toHaveLength(1);
  });
});

describe("appendInterviewerTurn", () => {
  it("stores what produced the turn", async () => {
    const userId = await newUser();
    const sessionId = await newSimulation(userId);

    expect(await ask(userId, sessionId)).toEqual({
      id: expect.any(String),
      position: 0,
      content: "Pertanyaan berikutnya?",
    });

    const [turn] = await db
      .select()
      .from(practiceTurns)
      .where(eq(practiceTurns.sessionId, sessionId));

    expect(turn).toMatchObject({ role: "interviewer", feedback: origin });
  });

  it("drops a turn written for a position that is taken", async () => {
    const userId = await newUser();
    const sessionId = await newSimulation(userId);
    const turn = { position: 0, content: "Halo.", origin, closes: false };

    expect(
      await appendInterviewerTurn(db, userId, sessionId, turn),
    ).not.toBeNull();
    expect(await appendInterviewerTurn(db, userId, sessionId, turn)).toBeNull();
    expect((await findSimulation(db, userId, sessionId))?.turns).toHaveLength(
      1,
    );
  });

  it("completes the session with the closing turn", async () => {
    const userId = await newUser();
    const sessionId = await newSimulation(userId);

    await ask(userId, sessionId, true);

    expect(await sessionRow(sessionId)).toMatchObject({
      status: "completed",
      endedAt: expect.any(Date),
    });
    expect(await ask(userId, sessionId)).toBeNull();
  });

  it("does not write into another user's session", async () => {
    const sessionId = await newSimulation(await newUser());

    expect(await ask(await newUser(), sessionId)).toBeNull();
  });
});

describe("endSimulation", () => {
  it("completes a session with at least one answer", async () => {
    const userId = await newUser();
    const sessionId = await newSimulation(userId);

    await ask(userId, sessionId);
    await say(userId, sessionId);

    expect(await endSimulation(db, userId, sessionId)).toEqual({
      status: "completed",
    });
    expect(await sessionRow(sessionId)).toMatchObject({
      status: "completed",
      endedAt: expect.any(Date),
    });
  });

  it("marks a session nobody answered in as abandoned", async () => {
    const userId = await newUser();
    const sessionId = await newSimulation(userId);

    await ask(userId, sessionId);
    await appendCandidateTurn(db, userId, sessionId, { kind: "think" }, NOW);

    expect(await endSimulation(db, userId, sessionId)).toEqual({
      status: "abandoned",
    });
  });

  it("leaves a session that already ended as it is", async () => {
    const userId = await newUser();
    const sessionId = await newSimulation(userId);

    await endSimulation(db, userId, sessionId);

    const { endedAt } = await sessionRow(sessionId);

    expect(await endSimulation(db, userId, sessionId)).toEqual({
      status: "abandoned",
    });
    expect((await sessionRow(sessionId)).endedAt).toEqual(endedAt);
  });

  it("does not end another user's session", async () => {
    const sessionId = await newSimulation(await newUser());

    expect(await endSimulation(db, await newUser(), sessionId)).toBeNull();
    expect((await sessionRow(sessionId)).status).toBe("in_progress");
  });
});

describe("saveSessionSummary", () => {
  const summary: StoredSummary = {
    promptVersion: "simulation-summary-v1",
    provider: "deepseek",
    model: "deepseek-flash",
    result: {
      overallStrengths: ["Runtut."],
      focusAreas: [],
      perQuestion: [],
      extractedQuestions: [],
      storySuggestions: [],
    },
  };

  it("writes the summary once", async () => {
    const userId = await newUser();
    const sessionId = await newSimulation(userId);

    expect(await saveSessionSummary(db, userId, sessionId, summary)).toBe(true);
    expect(
      await saveSessionSummary(db, userId, sessionId, {
        ...summary,
        model: "another",
      }),
    ).toBe(false);
    expect((await findSimulation(db, userId, sessionId))?.summary).toEqual(
      summary,
    );
  });

  it("does not write onto another user's session", async () => {
    const sessionId = await newSimulation(await newUser());

    expect(
      await saveSessionSummary(db, await newUser(), sessionId, summary),
    ).toBe(false);
  });
});

describe("listSimulations", () => {
  it("lists the user's simulations with their job, newest first", async () => {
    const userId = await newUser();
    const applicationId = await createApplication(db, userId, {
      events: [["interview", "2026-10-01"]],
    });
    const first = await newSimulation(userId, { applicationId });
    const second = await newSimulation(userId, { interviewType: "ai_builder" });

    await db
      .update(practiceSessions)
      .set({ startedAt: new Date("2026-10-01T00:00:00Z") })
      .where(eq(practiceSessions.id, first));
    await ask(userId, first);

    const rows = await listSimulations(db, userId);

    expect(rows.map((row) => row.id)).toEqual([second, first]);
    expect(rows[0]).toMatchObject({
      interviewType: "ai_builder",
      status: "in_progress",
      position: null,
      companyName: null,
    });
    expect(rows[0].lastActivityAt).toEqual(rows[0].startedAt);
    expect(rows[1]).toMatchObject({
      applicationId,
      position: "Software Engineer",
      companyName: expect.stringContaining("Perusahaan"),
    });
    expect(rows[1].lastActivityAt.getTime()).toBeGreaterThan(
      rows[1].startedAt.getTime(),
    );
  });

  it("leaves out drills and other users' sessions", async () => {
    const userId = await newUser();

    await createDrillSession(db, userId, answer(await newQuestion(userId)));
    await newSimulation(await newUser());

    expect(await listSimulations(db, userId)).toEqual([]);
  });
});

describe("findApplicationContext", () => {
  it("returns the job with the company's notes and the nearest stage", async () => {
    const userId = await newUser();
    const applicationId = await createApplication(db, userId, {
      events: [["interview", "2026-10-01"]],
    });
    const [application] = await db
      .update(applications)
      .set({ jobDescription: "Laravel dan PostgreSQL." })
      .where(eq(applications.id, applicationId))
      .returning({ companyId: applications.companyId });

    await db
      .update(companies)
      .set({ notes: "Tim kecil." })
      .where(eq(companies.id, application.companyId));
    await createInterview(db, userId, applicationId, {
      scheduledAt: new Date("2026-10-01T02:00:00Z"),
      stage: "hr",
    });
    await createInterview(db, userId, applicationId, {
      scheduledAt: new Date("2026-10-12T02:00:00Z"),
      stage: "final",
    });

    expect(
      await findApplicationContext(db, userId, applicationId, NOW),
    ).toEqual({
      position: "Software Engineer",
      companyName: expect.stringContaining("Perusahaan"),
      companyNotes: "Tim kecil.",
      jobDescription: "Laravel dan PostgreSQL.",
      stage: "final",
    });
  });

  it("has no stage without an interview", async () => {
    const userId = await newUser();
    const applicationId = await createApplication(db, userId, {
      events: [["applied", "2026-10-01"]],
    });

    expect(
      await findApplicationContext(db, userId, applicationId, NOW),
    ).toMatchObject({ stage: null, companyNotes: null, jobDescription: null });
  });

  it("hides another user's application", async () => {
    const applicationId = await createApplication(db, await newUser(), {
      events: [["applied", "2026-10-01"]],
    });

    expect(
      await findApplicationContext(db, await newUser(), applicationId, NOW),
    ).toBeNull();
  });
});

describe("listStoriesForSummary", () => {
  it("returns only the user's stories", async () => {
    const userId = await newUser();
    const storyId = await createStory(db, userId, "Migrasi");

    await createStory(db, await newUser(), "Milik orang lain");

    expect(await listStoriesForSummary(db, userId)).toEqual([
      {
        id: storyId,
        title: "Migrasi",
        situation: null,
        task: null,
        action: null,
        result: null,
      },
    ]);
  });
});

describe("addSessionQuestions", () => {
  const bank = (userId: string) =>
    db
      .select()
      .from(questions)
      .where(eq(questions.userId, userId))
      .orderBy(asc(questions.text));

  it("adds the questions as coming from practice, for the application", async () => {
    const userId = await newUser();
    const applicationId = await createApplication(db, userId, {
      events: [["interview", "2026-10-01"]],
    });

    expect(
      await addSessionQuestions(db, userId, {
        texts: ["Apa kelemahanmu?", "Kenapa pindah?"],
        category: "hr_general",
        applicationId,
      }),
    ).toEqual({ created: 2, skipped: 0 });
    expect(await bank(userId)).toMatchObject([
      {
        text: "Apa kelemahanmu?",
        source: "ai",
        category: "hr_general",
        applicationId,
        readiness: "not_ready",
      },
      { text: "Kenapa pindah?", source: "ai", applicationId },
    ]);
  });

  it("skips what the bank already has and what repeats in the batch", async () => {
    const userId = await newUser();

    await newQuestion(userId, { text: "Ceritakan proyek tersulitmu." });

    expect(
      await addSessionQuestions(db, userId, {
        texts: [
          "ceritakan  proyek tersulitmu",
          "Apa kelemahanmu?",
          "Apa kelemahanmu",
          "  ",
        ],
        category: "behavioral",
        applicationId: null,
      }),
    ).toEqual({ created: 1, skipped: 3 });
    expect(await bank(userId)).toHaveLength(2);
  });

  it("does not compare against another user's bank", async () => {
    const userId = await newUser();

    await newQuestion(await newUser(), { text: "Apa kelemahanmu?" });

    expect(
      await addSessionQuestions(db, userId, {
        texts: ["Apa kelemahanmu?"],
        category: "behavioral",
        applicationId: null,
      }),
    ).toEqual({ created: 1, skipped: 0 });
  });

  it("drops an application that is not the user's", async () => {
    const userId = await newUser();
    const applicationId = await createApplication(db, await newUser(), {
      events: [["interview", "2026-10-01"]],
    });

    await addSessionQuestions(db, userId, {
      texts: ["Apa kelemahanmu?"],
      category: "behavioral",
      applicationId,
    });

    expect(await bank(userId)).toMatchObject([{ applicationId: null }]);
  });
});

describe("linkStoryToSessionQuestion", () => {
  const links = (userId: string) =>
    db
      .select({
        questionId: questionStories.questionId,
        storyId: questionStories.storyId,
      })
      .from(questionStories)
      .where(eq(questionStories.userId, userId));

  it("links the story to the question the bank already has", async () => {
    const userId = await newUser();
    const questionId = await newQuestion(userId, { text: "Apa kelemahanmu?" });
    const storyId = await createStory(db, userId, "Belajar delegasi");
    const input = {
      text: "apa kelemahanmu",
      storyId,
      category: "behavioral",
      applicationId: null,
    } as const;

    expect(await linkStoryToSessionQuestion(db, userId, input)).toEqual({
      status: "linked",
      questionId,
    });
    expect(await linkStoryToSessionQuestion(db, userId, input)).toEqual({
      status: "linked",
      questionId,
    });
    expect(await links(userId)).toEqual([{ questionId, storyId }]);
  });

  it("adds the question when the bank does not have it", async () => {
    const userId = await newUser();
    const storyId = await createStory(db, userId, "Belajar delegasi");
    const linked = await linkStoryToSessionQuestion(db, userId, {
      text: "Apa kelemahanmu?",
      storyId,
      category: "hr_general",
      applicationId: null,
    });

    expect(linked.status).toBe("linked");
    expect(
      await db.select().from(questions).where(eq(questions.userId, userId)),
    ).toMatchObject([
      { text: "Apa kelemahanmu?", source: "ai", category: "hr_general" },
    ]);
    expect(await links(userId)).toHaveLength(1);
  });

  it("refuses a story of another user", async () => {
    const userId = await newUser();
    const storyId = await createStory(db, await newUser(), "Bukan milikmu");

    expect(
      await linkStoryToSessionQuestion(db, userId, {
        text: "Apa kelemahanmu?",
        storyId,
        category: "behavioral",
        applicationId: null,
      }),
    ).toEqual({ status: "story_not_found" });
    expect(
      await db.select().from(questions).where(eq(questions.userId, userId)),
    ).toEqual([]);
  });
});

describe("findQuestionsInBank", () => {
  it("says which questions the user has and what they are linked to", async () => {
    const userId = await newUser();
    const questionId = await newQuestion(userId, { text: "Apa kelemahanmu?" });
    const storyId = await createStory(db, userId, "Belajar delegasi");

    await db.insert(questionStories).values({ userId, questionId, storyId });
    await newQuestion(await newUser(), { text: "Kenapa pindah?" });

    expect(
      await findQuestionsInBank(db, userId, [
        "apa kelemahanmu",
        "Kenapa pindah?",
      ]),
    ).toEqual([
      { inBank: true, storyIds: [storyId] },
      { inBank: false, storyIds: [] },
    ]);
  });
});

describe("describeSummary", () => {
  it("adds what the bank knows to the model's notes", async () => {
    const userId = await newUser();
    const questionId = await newQuestion(userId, { text: "Apa kelemahanmu?" });
    const storyId = await createStory(db, userId, "Belajar delegasi");
    const foreign = await createStory(db, await newUser(), "Bukan milikmu");

    await db.insert(questionStories).values({ userId, questionId, storyId });

    expect(
      await describeSummary(db, userId, {
        overallStrengths: ["Runtut."],
        focusAreas: [{ aspect: "structure", note: "Mulai dari hasil." }],
        perQuestion: [],
        extractedQuestions: ["apa kelemahanmu", "Kenapa pindah?"],
        storySuggestions: [
          { question: "Apa kelemahanmu?", storyId, suggestion: "Pakai ini." },
          { question: "Kenapa pindah?", storyId, suggestion: "Juga ini." },
          { question: "Kenapa pindah?", storyId: foreign, suggestion: "X." },
          { question: "Kenapa pindah?", storyId: null, suggestion: "Tulis." },
          { question: "apa kelemahanmu", storyId: null, suggestion: "Sudah." },
        ],
      }),
    ).toEqual({
      overallStrengths: ["Runtut."],
      focusAreas: [{ aspect: "structure", note: "Mulai dari hasil." }],
      perQuestion: [],
      questions: [
        { text: "apa kelemahanmu", inBank: true },
        { text: "Kenapa pindah?", inBank: false },
      ],
      suggestions: [
        {
          question: "Apa kelemahanmu?",
          suggestion: "Pakai ini.",
          story: { id: storyId, title: "Belajar delegasi" },
          linked: true,
        },
        {
          question: "Kenapa pindah?",
          suggestion: "Juga ini.",
          story: { id: storyId, title: "Belajar delegasi" },
          linked: false,
        },
        {
          question: "Kenapa pindah?",
          suggestion: "X.",
          story: null,
          linked: false,
        },
        {
          question: "Kenapa pindah?",
          suggestion: "Tulis.",
          story: null,
          linked: false,
        },
        // It pointed at no story; the question has one by now.
        {
          question: "apa kelemahanmu",
          suggestion: "Sudah.",
          story: { id: storyId, title: "Belajar delegasi" },
          linked: true,
        },
      ],
    });
  });
});
