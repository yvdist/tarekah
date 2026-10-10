import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { questions, questionStories } from "@/db/schema";
import { createStory, createTestDb, createUser, type TestDb } from "@/test/db";
import { filterStories, findStory, listStories } from "./data";

let db: TestDb;
let close: () => Promise<void>;
let userCount = 0;

beforeAll(async () => ({ db, close } = await createTestDb()));
afterAll(() => close());

const newUser = () => createUser(db, `stories-${++userCount}`);

async function link(userId: string, storyId: string, text: string) {
  const [question] = await db
    .insert(questions)
    .values({ userId, source: "manual", text })
    .returning({ id: questions.id });
  await db
    .insert(questionStories)
    .values({ userId, questionId: question.id, storyId });
}

describe("listStories and findStory", () => {
  it("returns the stories with their competencies and question count", async () => {
    const userId = await newUser();
    const withLinks = await createStory(db, userId, "Migrasi monolith", [
      "ownership",
      "technical_depth",
    ]);
    const bare = await createStory(db, userId, "Konflik estimasi");
    await link(userId, withLinks, "Ceritakan proyek tersulit.");
    await link(userId, withLinks, "Keputusan teknis yang kamu sesali?");

    const rows = await listStories(db, userId);

    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.id === withLinks)).toMatchObject({
      competencies: ["ownership", "technical_depth"],
      questionCount: 2,
    });
    expect(rows.find((row) => row.id === bare)).toMatchObject({
      competencies: [],
      questionCount: 0,
    });

    const story = await findStory(db, userId, withLinks);
    expect(story?.questions.map((question) => question.text)).toEqual([
      "Ceritakan proyek tersulit.",
      "Keputusan teknis yang kamu sesali?",
    ]);
  });

  it("hides another user's stories", async () => {
    const owner = await newUser();
    const other = await newUser();
    const storyId = await createStory(db, owner, "Milik owner");

    expect(await listStories(db, other)).toEqual([]);
    expect(await findStory(db, other, storyId)).toBeNull();
  });
});

describe("filterStories", () => {
  const items = [
    {
      id: "1",
      title: "Migrasi monolith",
      situation: "Sistem lama lambat",
      task: null,
      action: null,
      result: null,
      competencies: ["ownership" as const],
      updatedAt: new Date(),
      questionCount: 0,
    },
    {
      id: "2",
      title: "Konflik estimasi",
      situation: null,
      task: null,
      action: "Mengajak bicara empat mata",
      result: null,
      competencies: ["conflict" as const, "collaboration" as const],
      updatedAt: new Date(),
      questionCount: 1,
    },
  ];

  it("matches the keyword in any part and the competency exactly", () => {
    expect(
      filterStories(items, { q: "lambat", competency: "" }).map((s) => s.id),
    ).toEqual(["1"]);
    expect(
      filterStories(items, { q: "", competency: "collaboration" }).map(
        (s) => s.id,
      ),
    ).toEqual(["2"]);
    expect(
      filterStories(items, { q: "empat", competency: "ownership" }),
    ).toEqual([]);
  });
});
