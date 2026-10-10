import type {
  ApplicationStatus,
  InterviewStage,
  PracticeInterviewType,
  PracticeLanguage,
  PracticeLevel,
  PracticeSessionStatus,
  PracticeTurnRole,
  QuestionCategory,
} from "@/db/schema/enum-values";
import { detectLanguage } from "./language";
import { normalizeQuestionText } from "./same-question";

// The rules of a simulation, with no database and no clock of their own: who
// speaks next, when the session is over, and when one left alone counts as
// abandoned. The server decides all of it; the model is only told.

// Minutes, as the values of a select.
export const SIMULATION_DURATIONS = ["15", "30"] as const;

export type SimulationDuration = (typeof SIMULATION_DURATIONS)[number];

// Minutes become a number of answers, which is what the session stores. The
// last answer replies to "do you have questions for us?", so a 15-minute
// session is five questions (follow-ups included) and that closing exchange.
export const DURATION_TURNS: Record<SimulationDuration, number> = {
  15: 6,
  30: 10,
};

export const durationOf = (maxTurns: number) =>
  SIMULATION_DURATIONS.find(
    (duration) => DURATION_TURNS[duration] === maxTurns,
  ) ?? null;

// Asking for the question again or for a moment to think is free: it does not
// use up an answer. It still costs the user a call to their provider, hence a
// ceiling.
export const CONTROL_LIMIT = 6;

export const ABANDON_AFTER_HOURS = 6;

export const CONTROL_KINDS = ["repeat", "think"] as const;

export type ControlKind = (typeof CONTROL_KINDS)[number];

// What the two buttons say for the candidate, in the language of the session:
// the point is to get used to saying it.
export const CONTROL_PHRASES: Record<
  PracticeLanguage,
  Record<ControlKind, string>
> = {
  id: {
    repeat: "Boleh diulang pertanyaannya?",
    think: "Saya pikir sebentar ya.",
  },
  en: {
    repeat: "Could you repeat the question, please?",
    think: "Let me think about that for a moment.",
  },
};

const CONTROL_BY_PHRASE = new Map(
  Object.values(CONTROL_PHRASES).flatMap((phrases) =>
    CONTROL_KINDS.map(
      (kind) => [normalizeQuestionText(phrases[kind]), kind] as const,
    ),
  ),
);

// Whether a candidate turn is one of those phrases rather than an answer.
// Typed by hand it counts the same: it is still not an answer.
export const controlKind = (content: string) =>
  CONTROL_BY_PHRASE.get(normalizeQuestionText(content)) ?? null;

export type SimulationTurn = { role: PracticeTurnRole; content: string };

export type InterviewerPhase =
  // Greets and asks the first question.
  | "opening"
  // Asks the next question, a follow-up or a new topic.
  | "ask"
  // Answers a request to repeat or to think, without moving on.
  | "respond"
  // Asks whether the candidate has questions for the interviewer.
  | "invite_questions"
  // Answers those questions and ends the interview.
  | "closing";

export type SimulationStep =
  | {
      actor: "interviewer";
      phase: InterviewerPhase;
      // Questions still to ask before the invitation, this one included.
      remaining: number;
      control: ControlKind | null;
    }
  | { actor: "candidate"; controlsLeft: number }
  | { actor: "none" };

// Who speaks next. `maxTurns` is the number of answers the session accepts;
// once the interviewer has replied to the last one, nobody speaks any more.
export function nextStep(
  maxTurns: number,
  turns: ReadonlyArray<SimulationTurn>,
): SimulationStep {
  const spoken = turns.filter((turn) => turn.role !== "system_event");
  const last = spoken.at(-1);
  const said = spoken.filter((turn) => turn.role === "candidate");
  const controls = said.filter((turn) => controlKind(turn.content)).length;
  const answers = said.length - controls;
  const remaining = Math.max(maxTurns - 1 - answers, 0);

  if (!last) {
    return { actor: "interviewer", phase: "opening", remaining, control: null };
  }

  if (last.role === "interviewer") {
    return answers >= maxTurns
      ? { actor: "none" }
      : {
          actor: "candidate",
          controlsLeft: Math.max(CONTROL_LIMIT - controls, 0),
        };
  }

  const control = controlKind(last.content);

  if (control) {
    return { actor: "interviewer", phase: "respond", remaining, control };
  }

  if (answers >= maxTurns) {
    return { actor: "interviewer", phase: "closing", remaining, control };
  }

  return {
    actor: "interviewer",
    phase: remaining > 0 ? "ask" : "invite_questions",
    remaining,
    control,
  };
}

// The turns the page was rendered with, plus the ones learned since (an answer
// just saved, a reply just streamed). The server's copy wins where both have a
// position, so a later render never shows a turn twice.
export function mergeTurns<T extends { position: number }>(
  saved: ReadonlyArray<T>,
  learned: ReadonlyArray<T>,
): T[] {
  const taken = new Set(saved.map((turn) => turn.position));

  return [
    ...saved,
    ...learned.filter((turn) => !taken.has(turn.position)),
  ].sort((a, b) => a.position - b.position);
}

// How many answers a transcript holds: a session with none was never really
// practised.
export const countAnswers = (turns: ReadonlyArray<SimulationTurn>) =>
  turns.filter(
    (turn) => turn.role === "candidate" && !controlKind(turn.content),
  ).length;

const ABANDON_AFTER_MS = ABANDON_AFTER_HOURS * 60 * 60 * 1000;

// A session nobody came back to. Nothing writes this: it is read off the last
// thing that happened, the way a follow-up is read off the last status.
export const isStale = (lastActivityAt: Date, now: number) =>
  now - lastActivityAt.getTime() > ABANDON_AFTER_MS;

export function effectiveStatus(
  session: { status: PracticeSessionStatus; lastActivityAt: Date },
  now: number,
): PracticeSessionStatus {
  return session.status === "in_progress" &&
    isStale(session.lastActivityAt, now)
    ? "abandoned"
    : session.status;
}

const STAGE_INTERVIEW_TYPES: Record<InterviewStage, PracticeInterviewType> = {
  hr: "hr_screening",
  technical: "technical_backend",
  user: "behavioral",
  final: "behavioral",
  other: "behavioral",
};

// Where a question from a session goes in the bank.
export const INTERVIEW_TYPE_CATEGORIES: Record<
  PracticeInterviewType,
  QuestionCategory
> = {
  hr_screening: "hr_general",
  behavioral: "behavioral",
  technical_backend: "technical_backend",
  system_design_light: "system_design",
  ai_builder: "ai_llm",
};

type ScheduledInterview = { scheduledAt: Date; stage: InterviewStage };

// The interview to prepare for: the next one, or failing that the latest.
export function nearestInterview<T extends ScheduledInterview>(
  interviews: ReadonlyArray<T>,
  now: number,
): T | null {
  const byTime = [...interviews].sort(
    (a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime(),
  );

  return (
    byTime.find((interview) => interview.scheduledAt.getTime() > now) ??
    byTime.at(-1) ??
    null
  );
}

// An application is worth practising for once an interview is on the way.
export const shouldOfferPractice = (
  status: ApplicationStatus,
  interviews: ReadonlyArray<ScheduledInterview>,
  now: number,
) =>
  status === "interview" ||
  interviews.some((interview) => interview.scheduledAt.getTime() > now);

const SENIOR_TITLE = /\b(senior|sr|lead|staff|principal)\b/i;

// The settings an application suggests. Every one of them can be changed
// before the session starts.
export function suggestSettings(application: {
  position: string;
  jobDescription: string | null;
  stage: InterviewStage | null;
}): {
  interviewType: PracticeInterviewType;
  level: PracticeLevel;
  language: PracticeLanguage;
} {
  return {
    interviewType: application.stage
      ? STAGE_INTERVIEW_TYPES[application.stage]
      : "behavioral",
    level: SENIOR_TITLE.test(application.position) ? "senior" : "mid",
    language: application.jobDescription?.trim()
      ? detectLanguage(application.jobDescription)
      : "id",
  };
}
