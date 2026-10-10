import { asc, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  practiceSessions,
  practiceTurns,
  questions,
  questionStories,
  stories,
} from "@/db/schema";
import {
  createApplication,
  createStory,
  createTestDb,
  createUser,
  type TestDb,
} from "@/test/db";
import {
  addFollowUpQuestion,
  createDrillSession,
  findDrillSession,
  findPracticeQuestion,
  saveTurnFeedback,
} from "./data";
import type { StoredFeedback } from "./schemas";

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
