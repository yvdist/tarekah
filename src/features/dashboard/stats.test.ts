import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createApplication,
  createCv,
  createTestDb,
  createUser,
  type TestDb,
} from "@/test/db";
import { queryStats, queryWeekly } from "./stats";

let db: TestDb;
let close: () => Promise<void>;
let userCount = 0;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});

afterAll(async () => {
  await close();
});

// Every test works on its own user, which is also what isolates them from each
// other inside the one database.
const newUser = () => createUser(db, `user-${++userCount}`);

const stats = (
  userId: string,
  from: string | null = null,
  to: string | null = null,
) => queryStats(db, userId, from, to);

describe("queryStats", () => {
  it("returns zeros and no rates for a user without applications", async () => {
    const userId = await newUser();

    expect(await stats(userId)).toEqual({
      summary: {
        total: 0,
        active: 0,
        interviews: 0,
        offers: 0,
        submitted: 0,
        responded: 0,
        responseRate: null,
      },
      funnel: [
        { stage: "applied", count: 0 },
        { stage: "screening", count: 0 },
        { stage: "technical_test", count: 0 },
        { stage: "interview", count: 0 },
        { stage: "offer", count: 0 },
      ],
      bySource: [],
      byCv: [],
      responseTime: { averageDays: null, sample: 0 },
    });
  });

  it("counts a wishlist entry in the total but not as submitted", async () => {
    const userId = await newUser();

    await createApplication(db, userId, {
      events: [["wishlist", "2026-09-01"]],
    });
    await createApplication(db, userId, {
      appliedAt: "2026-09-02",
      events: [
        ["wishlist", "2026-09-01"],
        ["applied", "2026-09-02"],
      ],
    });

    const { summary, bySource } = await stats(userId);

    expect(summary).toMatchObject({
      total: 2,
      active: 1,
      submitted: 1,
      responded: 0,
      responseRate: 0,
    });
    expect(bySource).toEqual([
      {
        source: "linkedin",
        submitted: 1,
        responded: 0,
        interviewed: 0,
        responseRate: 0,
        interviewRate: 0,
      },
    ]);
  });

  it("builds the funnel from the furthest stage each application reached", async () => {
    const userId = await newUser();

    // Went to interview, then was rejected: still counts up to interview.
    await createApplication(db, userId, {
      events: [
        ["applied", "2026-09-01"],
        ["screening", "2026-09-03"],
        ["interview", "2026-09-10"],
        ["rejected", "2026-09-15"],
      ],
    });
    // Moved backwards: the furthest stage is what counts.
    await createApplication(db, userId, {
      events: [
        ["applied", "2026-09-01"],
        ["technical_test", "2026-09-05"],
        ["screening", "2026-09-06"],
      ],
    });
    // Recorded straight at offer, without the earlier steps.
    await createApplication(db, userId, {
      events: [["offer", "2026-09-20"]],
    });
    await createApplication(db, userId, {
      events: [["applied", "2026-09-01"]],
    });

    const { summary, funnel } = await stats(userId);

    expect(funnel).toEqual([
      { stage: "applied", count: 4 },
      { stage: "screening", count: 3 },
      { stage: "technical_test", count: 3 },
      { stage: "interview", count: 2 },
      { stage: "offer", count: 1 },
    ]);
    expect(summary).toMatchObject({
      total: 4,
      // Current status applied or screening; rejected and offer are closed.
      active: 2,
      interviews: 2,
      offers: 1,
      submitted: 4,
      responded: 3,
      responseRate: 75,
    });
  });

  it("treats a rejection as a response and ghosting as none", async () => {
    const userId = await newUser();

    await createApplication(db, userId, {
      events: [["rejected", "2026-09-05"]],
    });
    await createApplication(db, userId, {
      events: [
        ["applied", "2026-09-01"],
        ["ghosted", "2026-09-25"],
      ],
    });
    await createApplication(db, userId, {
      events: [["ghosted", "2026-09-25"]],
    });

    const { summary, funnel } = await stats(userId);

    expect(summary).toMatchObject({
      total: 3,
      active: 0,
      submitted: 3,
      responded: 1,
      responseRate: 33.3,
    });
    expect(funnel[0]).toEqual({ stage: "applied", count: 3 });
    expect(funnel[1]).toEqual({ stage: "screening", count: 0 });
  });

  it("filters the cohort by applied date, bounds included", async () => {
    const userId = await newUser();

    for (const appliedAt of [
      "2026-08-31",
      "2026-09-01",
      "2026-09-30",
      "2026-10-01",
    ]) {
      await createApplication(db, userId, {
        appliedAt,
        events: [["applied", appliedAt]],
      });
    }
    await createApplication(db, userId, {
      events: [["wishlist", "2026-09-10"]],
    });

    expect((await stats(userId)).summary.total).toBe(5);
    expect(
      (await stats(userId, "2026-09-01", "2026-09-30")).summary.total,
    ).toBe(2);
    expect((await stats(userId, "2026-09-01", null)).summary.total).toBe(3);
    expect((await stats(userId, null, "2026-09-01")).summary.total).toBe(2);
    expect((await stats(userId, "2027-01-01", null)).summary).toMatchObject({
      total: 0,
      responseRate: null,
    });
  });

  it("groups rates by source, busiest first", async () => {
    const userId = await newUser();

    await createApplication(db, userId, {
      source: "referral",
      events: [
        ["applied", "2026-09-01"],
        ["interview", "2026-09-08"],
      ],
    });
    await createApplication(db, userId, {
      source: "linkedin",
      events: [
        ["applied", "2026-09-01"],
        ["screening", "2026-09-04"],
      ],
    });
    await createApplication(db, userId, {
      source: "linkedin",
      events: [["applied", "2026-09-01"]],
    });
    await createApplication(db, userId, {
      source: "linkedin",
      events: [["applied", "2026-09-02"]],
    });
    // Never sent, so this source must not show up.
    await createApplication(db, userId, {
      source: "glints",
      events: [["wishlist", "2026-09-02"]],
    });

    expect((await stats(userId)).bySource).toEqual([
      {
        source: "linkedin",
        submitted: 3,
        responded: 1,
        interviewed: 0,
        responseRate: 33.3,
        interviewRate: 0,
      },
      {
        source: "referral",
        submitted: 1,
        responded: 1,
        interviewed: 1,
        responseRate: 100,
        interviewRate: 100,
      },
    ]);
  });

  it("groups rates by CV version, with applications without one last", async () => {
    const userId = await newUser();
    const v1 = await createCv(db, userId, "CV v1");
    const v2 = await createCv(db, userId, "CV v2");

    await createApplication(db, userId, {
      cvDocumentId: v1,
      events: [["applied", "2026-09-01"]],
    });
    await createApplication(db, userId, {
      cvDocumentId: v2,
      events: [
        ["applied", "2026-09-01"],
        ["interview", "2026-09-08"],
      ],
    });
    await createApplication(db, userId, {
      cvDocumentId: v2,
      events: [["applied", "2026-09-01"]],
    });
    await createApplication(db, userId, {
      events: [
        ["applied", "2026-09-01"],
        ["rejected", "2026-09-03"],
      ],
    });

    expect((await stats(userId)).byCv).toEqual([
      {
        id: v1,
        label: "CV v1",
        isArchived: false,
        submitted: 1,
        responded: 0,
        interviewed: 0,
        responseRate: 0,
        interviewRate: 0,
      },
      {
        id: v2,
        label: "CV v2",
        isArchived: false,
        submitted: 2,
        responded: 1,
        interviewed: 1,
        responseRate: 50,
        interviewRate: 50,
      },
      {
        id: null,
        label: null,
        isArchived: null,
        submitted: 1,
        responded: 1,
        interviewed: 0,
        responseRate: 100,
        interviewRate: 0,
      },
    ]);
  });

  it("averages the time from applying to the first response", async () => {
    const userId = await newUser();

    // 4 days to the first response; the later one is ignored.
    await createApplication(db, userId, {
      events: [
        ["applied", "2026-09-01"],
        ["screening", "2026-09-05"],
        ["interview", "2026-09-20"],
      ],
    });
    // 1.5 days.
    await createApplication(db, userId, {
      events: [
        ["applied", "2026-09-01T00:00:00Z"],
        ["rejected", "2026-09-02T12:00:00Z"],
      ],
    });
    // No response: ghosting does not count, so no sample.
    await createApplication(db, userId, {
      events: [
        ["applied", "2026-09-01"],
        ["ghosted", "2026-09-25"],
      ],
    });
    // No "applied" event to measure from.
    await createApplication(db, userId, {
      events: [["interview", "2026-09-10"]],
    });

    expect((await stats(userId)).responseTime).toEqual({
      // (4 + 1.5) / 2 = 2.75, rounded to one decimal.
      averageDays: 2.8,
      sample: 2,
    });
  });

  it("never counts another user's applications or documents", async () => {
    const owner = await newUser();
    const other = await newUser();
    const otherCv = await createCv(db, other, "CV orang lain");

    await createApplication(db, owner, {
      events: [["applied", "2026-09-01"]],
    });
    await createApplication(db, other, {
      cvDocumentId: otherCv,
      source: "referral",
      events: [
        ["applied", "2026-09-01"],
        ["offer", "2026-09-10"],
      ],
    });

    const result = await stats(owner);

    expect(result.summary).toMatchObject({
      total: 1,
      offers: 0,
      responded: 0,
    });
    expect(result.bySource.map((row) => row.source)).toEqual(["linkedin"]);
    expect(result.byCv.map((row) => row.label)).toEqual([null]);
    expect(result.responseTime.sample).toBe(0);
  });
});

describe("queryWeekly", () => {
  // 2026-10-09 is a Friday; its week starts on Monday 2026-10-05.
  const TODAY = "2026-10-09";

  it("returns the last twelve weeks, Monday first, with empty weeks as zero", async () => {
    const userId = await newUser();
    const weeks = await queryWeekly(db, userId, TODAY);

    expect(weeks).toHaveLength(12);
    expect(weeks[0]).toEqual({ weekStart: "2026-07-20", count: 0 });
    expect(weeks[11]).toEqual({ weekStart: "2026-10-05", count: 0 });
  });

  it("puts each application in the week of its applied date", async () => {
    const userId = await newUser();

    for (const appliedAt of [
      // Monday and Sunday of the current week.
      "2026-10-05",
      "2026-10-11",
      // Sunday of the week before.
      "2026-10-04",
      // First day shown, and the day before it.
      "2026-07-20",
      "2026-07-19",
    ]) {
      await createApplication(db, userId, {
        appliedAt,
        events: [["applied", appliedAt]],
      });
    }
    // No applied date: not on the chart.
    await createApplication(db, userId, {
      events: [["wishlist", "2026-10-06"]],
    });

    const weeks = await queryWeekly(db, userId, TODAY);
    const byWeek = Object.fromEntries(
      weeks.map((week) => [week.weekStart, week.count]),
    );

    expect(byWeek["2026-10-05"]).toBe(2);
    expect(byWeek["2026-09-28"]).toBe(1);
    expect(byWeek["2026-07-20"]).toBe(1);
    expect(weeks.reduce((sum, week) => sum + week.count, 0)).toBe(4);
  });

  it("never counts another user's applications", async () => {
    const owner = await newUser();
    const other = await newUser();

    await createApplication(db, other, {
      appliedAt: "2026-10-06",
      events: [["applied", "2026-10-06"]],
    });

    const weeks = await queryWeekly(db, owner, TODAY);

    expect(weeks.every((week) => week.count === 0)).toBe(true);
  });
});
