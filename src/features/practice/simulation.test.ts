import { describe, expect, it } from "vitest";
import type { InterviewStage } from "@/db/schema/enum-values";
import {
  ABANDON_AFTER_HOURS,
  CONTROL_LIMIT,
  CONTROL_PHRASES,
  controlKind,
  countAnswers,
  DURATION_TURNS,
  durationOf,
  effectiveStatus,
  mergeTurns,
  nearestInterview,
  nextStep,
  shouldOfferPractice,
  type SimulationTurn,
  suggestSettings,
} from "./simulation";

const asked = (content = "Pertanyaan"): SimulationTurn => ({
  role: "interviewer",
  content,
});
const answered = (content = "Jawaban"): SimulationTurn => ({
  role: "candidate",
  content,
});
const REPEAT = answered(CONTROL_PHRASES.id.repeat);
const THINK = answered(CONTROL_PHRASES.en.think);

// A session of `answers` full exchanges, ending on the candidate.
const exchanges = (answers: number) =>
  Array.from({ length: answers }, () => [asked(), answered()]).flat();

describe("durations", () => {
  it("maps minutes to answers and back", () => {
    expect(DURATION_TURNS).toEqual({ 15: 6, 30: 10 });
    expect(durationOf(6)).toBe("15");
    expect(durationOf(10)).toBe("30");
    expect(durationOf(7)).toBeNull();
  });
});

describe("controlKind", () => {
  it("recognizes the phrases in both languages", () => {
    expect(controlKind(CONTROL_PHRASES.id.repeat)).toBe("repeat");
    expect(controlKind(CONTROL_PHRASES.id.think)).toBe("think");
    expect(controlKind(CONTROL_PHRASES.en.repeat)).toBe("repeat");
    expect(controlKind(CONTROL_PHRASES.en.think)).toBe("think");
  });

  it("ignores case, spacing and closing punctuation", () => {
    expect(controlKind("  boleh diulang   pertanyaannya ")).toBe("repeat");
    expect(controlKind("Saya pikir sebentar ya")).toBe("think");
  });

  it("leaves an answer alone", () => {
    expect(controlKind("Boleh diulang pertanyaannya? Saya kurang paham.")).toBe(
      null,
    );
    expect(controlKind("")).toBeNull();
  });
});

describe("nextStep", () => {
  it("opens with the interviewer", () => {
    expect(nextStep(6, [])).toEqual({
      actor: "interviewer",
      phase: "opening",
      remaining: 5,
      control: null,
    });
  });

  it("waits for the candidate after a question", () => {
    expect(nextStep(6, [asked()])).toEqual({
      actor: "candidate",
      controlsLeft: CONTROL_LIMIT,
    });
  });

  it("asks until one answer is left, counting down", () => {
    expect(nextStep(6, exchanges(1))).toMatchObject({
      phase: "ask",
      remaining: 4,
    });
    expect(nextStep(6, exchanges(4))).toMatchObject({
      phase: "ask",
      remaining: 1,
    });
  });

  it("invites questions before the last answer", () => {
    expect(nextStep(6, exchanges(5))).toMatchObject({
      actor: "interviewer",
      phase: "invite_questions",
      remaining: 0,
    });
  });

  it("closes after the last answer, whatever the model would rather do", () => {
    expect(nextStep(6, exchanges(6))).toMatchObject({
      actor: "interviewer",
      phase: "closing",
    });
  });

  it("lets nobody speak once the closing is said", () => {
    expect(nextStep(6, [...exchanges(6), asked("Terima kasih.")])).toEqual({
      actor: "none",
    });
  });

  it("closes a session that somehow holds more answers than allowed", () => {
    expect(nextStep(2, exchanges(4))).toMatchObject({ phase: "closing" });
    expect(nextStep(2, [...exchanges(4), asked()])).toEqual({ actor: "none" });
  });

  it("answers a request to repeat without using up an answer", () => {
    const turns = [...exchanges(2), asked(), REPEAT];

    expect(nextStep(6, turns)).toEqual({
      actor: "interviewer",
      phase: "respond",
      remaining: 3,
      control: "repeat",
    });
    expect(nextStep(6, [...turns, asked(), answered()])).toMatchObject({
      phase: "ask",
      remaining: 2,
    });
  });

  it("answers a request to think the same way", () => {
    expect(nextStep(6, [asked(), THINK])).toMatchObject({
      phase: "respond",
      control: "think",
      remaining: 5,
    });
  });

  it("counts down the requests that are left", () => {
    const turns = [asked(), REPEAT, asked(), THINK, asked()];

    expect(nextStep(6, turns)).toEqual({
      actor: "candidate",
      controlsLeft: CONTROL_LIMIT - 2,
    });
  });

  it("never reports a negative number of requests", () => {
    const turns = Array.from({ length: CONTROL_LIMIT + 2 }, () => [
      asked(),
      REPEAT,
    ]).flat();

    expect(nextStep(6, [...turns, asked()])).toEqual({
      actor: "candidate",
      controlsLeft: 0,
    });
  });

  it("does not let requests postpone the end", () => {
    const turns = [...exchanges(5), asked("Ada pertanyaan?"), REPEAT];

    expect(nextStep(6, turns)).toMatchObject({ phase: "respond" });
    expect(nextStep(6, [...turns, asked(), answered()])).toMatchObject({
      phase: "closing",
    });
  });

  it("ignores system events", () => {
    expect(
      nextStep(6, [asked(), { role: "system_event", content: "note" }]),
    ).toMatchObject({ actor: "candidate" });
  });
});

describe("countAnswers", () => {
  it("leaves out requests and the interviewer", () => {
    expect(countAnswers([asked(), REPEAT, asked(), answered(), asked()])).toBe(
      1,
    );
  });
});

describe("effectiveStatus", () => {
  const now = Date.parse("2026-10-10T12:00:00Z");
  const hoursAgo = (hours: number) => new Date(now - hours * 60 * 60 * 1000);

  it("keeps a recent session in progress", () => {
    expect(
      effectiveStatus(
        { status: "in_progress", lastActivityAt: hoursAgo(1) },
        now,
      ),
    ).toBe("in_progress");
    expect(
      effectiveStatus(
        {
          status: "in_progress",
          lastActivityAt: hoursAgo(ABANDON_AFTER_HOURS),
        },
        now,
      ),
    ).toBe("in_progress");
  });

  it("reads a session left alone as abandoned", () => {
    expect(
      effectiveStatus(
        {
          status: "in_progress",
          lastActivityAt: hoursAgo(ABANDON_AFTER_HOURS + 0.1),
        },
        now,
      ),
    ).toBe("abandoned");
  });

  it("never changes a session that ended", () => {
    expect(
      effectiveStatus(
        { status: "completed", lastActivityAt: hoursAgo(100) },
        now,
      ),
    ).toBe("completed");
    expect(
      effectiveStatus(
        { status: "abandoned", lastActivityAt: hoursAgo(0) },
        now,
      ),
    ).toBe("abandoned");
  });
});

describe("interviews of an application", () => {
  const now = Date.parse("2026-10-10T12:00:00Z");
  const at = (date: string, stage: InterviewStage) => ({
    scheduledAt: new Date(`${date}T02:00:00Z`),
    stage,
  });
  const past = at("2026-10-01", "hr");
  const older = at("2026-09-01", "hr");
  const soon = at("2026-10-12", "technical");
  const later = at("2026-10-20", "final");

  it("prepares for the next interview", () => {
    expect(nearestInterview([later, past, soon], now)).toBe(soon);
  });

  it("falls back to the latest one", () => {
    expect(nearestInterview([older, past], now)).toBe(past);
    expect(nearestInterview([], now)).toBeNull();
  });

  it("offers practice at the interview stage or with one scheduled", () => {
    expect(shouldOfferPractice("interview", [], now)).toBe(true);
    expect(shouldOfferPractice("applied", [soon], now)).toBe(true);
    expect(shouldOfferPractice("applied", [past], now)).toBe(false);
    expect(shouldOfferPractice("screening", [], now)).toBe(false);
  });
});

describe("suggestSettings", () => {
  it("reads the type off the interview stage", () => {
    const suggest = (stage: "hr" | "technical" | "user" | "final" | "other") =>
      suggestSettings({ position: "Engineer", jobDescription: null, stage })
        .interviewType;

    expect(suggest("hr")).toBe("hr_screening");
    expect(suggest("technical")).toBe("technical_backend");
    expect(suggest("user")).toBe("behavioral");
    expect(suggest("final")).toBe("behavioral");
    expect(suggest("other")).toBe("behavioral");
  });

  it("defaults to a behavioral, mid-level session in Indonesian", () => {
    expect(
      suggestSettings({
        position: "Backend Engineer",
        jobDescription: "  ",
        stage: null,
      }),
    ).toEqual({ interviewType: "behavioral", level: "mid", language: "id" });
  });

  it("reads the level off the title", () => {
    const level = (position: string) =>
      suggestSettings({ position, jobDescription: null, stage: null }).level;

    expect(level("Senior Backend Engineer")).toBe("senior");
    expect(level("Sr. Engineer")).toBe("senior");
    expect(level("Tech Lead")).toBe("senior");
    expect(level("Leadership Coach")).toBe("mid");
  });

  it("reads the language off the job description", () => {
    expect(
      suggestSettings({
        position: "Engineer",
        jobDescription:
          "We are looking for an engineer who can work with the team and own the design of our services.",
        stage: null,
      }).language,
    ).toBe("en");
  });
});

describe("mergeTurns", () => {
  const turn = (position: number, content: string) => ({ position, content });

  it("adds what was learned after the page was rendered", () => {
    expect(
      mergeTurns([turn(0, "a")], [turn(2, "c"), turn(1, "b")]).map(
        ({ content }) => content,
      ),
    ).toEqual(["a", "b", "c"]);
  });

  it("keeps the server's copy of a turn both have", () => {
    expect(
      mergeTurns([turn(0, "a"), turn(1, "server")], [turn(1, "client")]),
    ).toEqual([turn(0, "a"), turn(1, "server")]);
  });
});
