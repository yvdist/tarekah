import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { questions, questionStories } from "@/db/schema";
import {
  createApplication,
  createInterview,
  createStory,
  createTestDb,
  createUser,
  type TestDb,
} from "@/test/db";
import {
  findOwnedStoryIds,
  listInterviewQuestions,
  listQuestions,
  syncInterviewQuestions,
} from "./data";

let db: TestDb;
let close: () => Promise<void>;
let userCount = 0;

beforeAll(async () => ({ db, close } = await createTestDb()));
afterAll(() => close());

const newUser = () => createUser(db, `questions-${++userCount}`);

const newApplication = (userId: string) =>
  createApplication(db, userId, { events: [["interview", "2026-09-20"]] });

describe("listQuestions", () => {
  it("returns the user's questions with their origin and stories", async () => {
    const userId = await newUser();
    const applicationId = await newApplication(userId);
    const interviewId = await createInterview(db, userId, applicationId, {
      stage: "hr",
    });
    const storyId = await createStory(db, userId, "Migrasi monolith");
    const [question] = await db
      .insert(questions)
      .values({
        userId,
        interviewId,
        applicationId,
        source: "interview",
        text: "Kenapa pindah?",
      })
      .returning({ id: questions.id });
    await db.insert(questions).values({
      userId,
      source: "manual",
      text: "Apa itu CAP theorem?",
      category: "system_design",
      readiness: "ready",
    });
    await db
      .insert(questionStories)
      .values({ userId, questionId: question.id, storyId });

    const rows = await listQuestions(db, userId);

    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.id === question.id)).toMatchObject({
      text: "Kenapa pindah?",
      source: "interview",
      category: "other",
      readiness: "not_ready",
      stage: "hr",
      position: "Software Engineer",
      stories: [{ id: storyId, title: "Migrasi monolith" }],
    });
    expect(rows.find((row) => row.source === "manual")).toMatchObject({
      text: "Apa itu CAP theorem?",
      interviewId: null,
      applicationId: null,
      stage: null,
      companyName: null,
      stories: [],
    });
  });

  it("never shows another user's questions or stories", async () => {
    const owner = await newUser();
    const other = await newUser();
    const ownerStory = await createStory(db, owner, "Milik owner");
    const [ownerQuestion] = await db
      .insert(questions)
      .values({ userId: owner, source: "manual", text: "Punya owner" })
      .returning({ id: questions.id });
    await db.insert(questionStories).values({
      userId: owner,
      questionId: ownerQuestion.id,
      storyId: ownerStory,
    });

    expect(await listQuestions(db, other)).toEqual([]);
    expect(await findOwnedStoryIds(db, other, [ownerStory])).toEqual([]);
    expect(await findOwnedStoryIds(db, owner, [ownerStory])).toEqual([
      ownerStory,
    ]);
  });
});

describe("syncInterviewQuestions", () => {
  it("inserts, updates and deletes to match the editor rows", async () => {
    const userId = await newUser();
    const applicationId = await newApplication(userId);
    const interview = {
      id: await createInterview(db, userId, applicationId),
      applicationId,
    };

    await syncInterviewQuestions(db, userId, interview, [
      { id: null, text: "Pertama" },
      { id: null, text: "Kedua" },
      { id: null, text: "Ketiga" },
    ]);

    const before = await listInterviewQuestions(db, userId, [interview.id]);
    expect(before.map((row) => row.text)).toEqual([
      "Pertama",
      "Kedua",
      "Ketiga",
    ]);

    // Mark one as ready, then edit its text: readiness must survive.
    await db
      .update(questions)
      .set({ readiness: "ready" })
      .where(eq(questions.id, before[1].id));

    const result = await syncInterviewQuestions(db, userId, interview, [
      { id: before[1].id, text: "Kedua (diperbaiki)" },
      { id: null, text: "Keempat" },
    ]);

    const after = await listInterviewQuestions(db, userId, [interview.id]);
    expect(result).toEqual({ missing: 0 });
    expect(after.map((row) => [row.text, row.readiness])).toEqual([
      ["Kedua (diperbaiki)", "ready"],
      ["Keempat", "not_ready"],
    ]);
  });

  it("ignores ids that belong to another user or interview", async () => {
    const owner = await newUser();
    const other = await newUser();
    const ownerApplication = await newApplication(owner);
    const otherApplication = await newApplication(other);
    const ownerInterview = {
      id: await createInterview(db, owner, ownerApplication),
      applicationId: ownerApplication,
    };
    const otherInterview = {
      id: await createInterview(db, other, otherApplication),
      applicationId: otherApplication,
    };

    await syncInterviewQuestions(db, owner, ownerInterview, [
      { id: null, text: "Rahasia owner" },
    ]);
    const [ownerQuestion] = await listInterviewQuestions(db, owner, [
      ownerInterview.id,
    ]);

    const result = await syncInterviewQuestions(db, other, otherInterview, [
      { id: ownerQuestion.id, text: "Dibajak" },
    ]);

    expect(result).toEqual({ missing: 1 });
    expect(
      (await listInterviewQuestions(db, owner, [ownerInterview.id])).map(
        (row) => row.text,
      ),
    ).toEqual(["Rahasia owner"]);
    expect(
      await listInterviewQuestions(db, other, [otherInterview.id]),
    ).toEqual([]);
  });
});
