import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { applications } from "./applications";
import { createdAt, id, userId } from "./columns";
import {
  practiceInterviewType,
  practiceLanguage,
  practiceLevel,
  practiceMode,
  practiceSessionStatus,
  practiceTone,
  practiceTurnRole,
} from "./enums";
import { questions } from "./questions";

// One practice attempt. A drill is a single question and answer; a simulation
// is a whole interview, and only a simulation has a type, level, tone and turn
// limit. The session outlives the application it was about.
export const practiceSessions = pgTable(
  "practice_sessions",
  {
    id: id(),
    userId: userId(),
    applicationId: uuid().references(() => applications.id, {
      onDelete: "set null",
    }),
    mode: practiceMode().notNull(),
    interviewType: practiceInterviewType(),
    level: practiceLevel(),
    tone: practiceTone(),
    maxTurns: integer(),
    language: practiceLanguage().notNull(),
    status: practiceSessionStatus().notNull().default("in_progress"),
    startedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp({ withTimezone: true }),
    // The closing summary of a simulation, validated with Zod when read.
    summary: jsonb(),
  },
  (t) => [
    index().on(t.userId, t.startedAt),
    check(
      "practice_sessions_simulation_settings_check",
      sql`${t.mode} <> 'simulation' or (${t.interviewType} is not null and ${t.level} is not null and ${t.tone} is not null and ${t.maxTurns} > 0)`,
    ),
  ],
);

// What was said in a session, in order. Append-only except for feedback, which
// is written onto the candidate's turn once the model has answered.
export const practiceTurns = pgTable(
  "practice_turns",
  {
    id: id(),
    userId: userId(),
    sessionId: uuid()
      .notNull()
      .references(() => practiceSessions.id, { onDelete: "cascade" }),
    position: integer().notNull(),
    role: practiceTurnRole().notNull(),
    content: text().notNull(),
    questionId: uuid().references(() => questions.id, {
      onDelete: "set null",
    }),
    // What the model produced about or for this turn, validated with Zod when
    // read: on a candidate's turn of a drill, the feedback on the answer; on
    // an interviewer's turn of a simulation, what wrote it (prompt version,
    // provider, model).
    feedback: jsonb(),
    createdAt: createdAt(),
  },
  (t) => [
    unique("practice_turns_session_id_position_unique").on(
      t.sessionId,
      t.position,
    ),
    index().on(t.questionId),
  ],
);
