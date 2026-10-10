import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createApplication,
  createInterview,
  createTestDb,
  createUser,
  type TestDb,
} from "@/test/db";
import { backfillQuestions } from "./backfill";
import { listInterviewQuestions, listQuestions } from "./data";

// The script runs over every user and its summary counts all of them, so
// each test gets its own database.
let db: TestDb;
let close: () => Promise<void>;
let userId: string;

beforeEach(async () => {
  ({ db, close } = await createTestDb());
  userId = await createUser(db, "backfill");
});
afterEach(() => close());

async function newInterview(questions: string | null) {
  const applicationId = await createApplication(db, userId, {
    events: [["interview", "2026-09-20"]],
  });
  const id = await createInterview(db, userId, applicationId, { questions });

  return { id, applicationId };
}

describe("backfillQuestions", () => {
  it("splits the markdown into rows that point at their interview", async () => {
    const interview = await newInterview(
      "- Kenapa pindah?\n\n  - Ceritakan proyek tersulit.\n1. Ekspektasi gaji?\nAda pertanyaan untuk kami?",
    );

    const summary = await backfillQuestions(db);

    expect(summary).toEqual({ interviews: 1, inserted: 4, skipped: 0 });

    const rows = await listInterviewQuestions(db, userId, [interview.id]);
    expect(rows.map((row) => row.text)).toEqual([
      "Kenapa pindah?",
      "Ceritakan proyek tersulit.",
      "Ekspektasi gaji?",
      "Ada pertanyaan untuk kami?",
    ]);
    expect(await listQuestions(db, userId)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "interview",
          category: "other",
          readiness: "not_ready",
          interviewId: interview.id,
          applicationId: interview.applicationId,
        }),
      ]),
    );
  });

  it("is idempotent and skips duplicates within one interview", async () => {
    const interview = await newInterview(
      "Kenapa pindah?\nkenapa  pindah?\nEkspektasi gaji?",
    );

    const first = await backfillQuestions(db);
    const second = await backfillQuestions(db);

    expect(first).toEqual({ interviews: 1, inserted: 2, skipped: 0 });
    expect(second).toEqual({ interviews: 1, inserted: 0, skipped: 2 });
    expect(
      (await listInterviewQuestions(db, userId, [interview.id])).map(
        (row) => row.text,
      ),
    ).toEqual(["Kenapa pindah?", "Ekspektasi gaji?"]);
  });

  it("ignores empty markdown and writes nothing in dry-run mode", async () => {
    await newInterview(null);
    await newInterview("\n- \n");
    const interview = await newInterview("Satu?");

    const dry = await backfillQuestions(db, { dryRun: true });

    expect(dry).toEqual({ interviews: 1, inserted: 1, skipped: 0 });
    expect(await listInterviewQuestions(db, userId, [interview.id])).toEqual(
      [],
    );
  });
});
