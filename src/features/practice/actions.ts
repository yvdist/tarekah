"use server";

import { updateTag } from "next/cache";
import { after } from "next/server";
import { db } from "@/db";
import type {
  AiProvider,
  PracticeSessionStatus,
} from "@/db/schema/enum-values";
import { findActiveProvider } from "@/features/ai/data";
import { AI_ERROR_MESSAGES, reportAiError } from "@/features/ai/errors";
import { getModelForUser } from "@/features/ai/model";
import { storyIdSchema } from "@/features/stories/schemas";
import { type ActionResult, invalidResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth";
import {
  addFollowUpQuestion,
  addSessionQuestions,
  appendCandidateTurn,
  createDrillSession,
  createSimulationSession,
  describeSummary,
  endSimulation,
  findApplicationContext,
  findDrillSession,
  findSimulation,
  linkStoryToSessionQuestion,
  listLinkedStories,
  listStoriesForSummary,
  saveSessionSummary,
  saveTurnFeedback,
  type SummaryView,
} from "./data";
import { generateDrillFeedback } from "./feedback";
import {
  prepareInterviewerTurn,
  type ReplyEvent,
  type SavedTurn,
  streamInterviewerTurn,
} from "./interviewer";
import { DRILL_FEEDBACK_PROMPT_VERSION } from "./prompts/drill-feedback";
import { SIMULATION_SUMMARY_PROMPT_VERSION } from "./prompts/simulation-summary";
import {
  drillAnswerSchema,
  sessionIdSchema,
  simulationSettingsSchema,
  simulationTurnSchema,
  type StoredFeedback,
  storedFeedbackSchema,
  type StoredSummary,
  storedSummarySchema,
  summaryIndexesSchema,
  summaryIndexSchema,
} from "./schemas";
import {
  countAnswers,
  DURATION_TURNS,
  INTERVIEW_TYPE_CATEGORIES,
} from "./simulation";
import { generateSimulationSummary } from "./summary";

const SESSION_NOT_FOUND_MESSAGE = "Sesi latihan tidak ditemukan.";

// Saves one answer as a completed drill. It works without an AI key: feedback
// is asked for separately, with the id this returns.
export async function saveDrillAnswer(
  input: unknown,
): Promise<ActionResult<{ sessionId: string }>> {
  const user = await requireUser();
  const parsed = drillAnswerSchema.safeParse(input);

  if (!parsed.success) {
    return invalidResult(parsed.error);
  }

  const session = await createDrillSession(db, user.id, parsed.data);

  if (!session) {
    return { ok: false, message: "Pertanyaan tidak ditemukan." };
  }

  // The dashboard counts completed sessions.
  updateTag(`practice:${user.id}`);

  return { ok: true, data: session };
}

// Having no key is an ordinary state, not a failure: the page then invites the
// user to set one.
export type DrillFeedbackOutcome =
  { status: "ready"; feedback: StoredFeedback } | { status: "not_configured" };

// Feedback on a saved answer. The question and the answer are read from the
// database, never taken from the client, and feedback that was already
// produced is returned as it is: asking twice does not bill the user twice.
export async function requestDrillFeedback(
  sessionId: unknown,
): Promise<ActionResult<DrillFeedbackOutcome>> {
  const user = await requireUser();
  const parsed = sessionIdSchema.safeParse(sessionId);

  if (!parsed.success) {
    return { ok: false, message: SESSION_NOT_FOUND_MESSAGE };
  }

  const session = await findDrillSession(db, user.id, parsed.data);

  if (!session) {
    return { ok: false, message: SESSION_NOT_FOUND_MESSAGE };
  }

  const stored = storedFeedbackSchema.safeParse(session.feedback);

  if (stored.success) {
    return { ok: true, data: { status: "ready", feedback: stored.data } };
  }

  let provider: AiProvider | undefined;

  try {
    const resolved = await getModelForUser(db, user.id);

    if (!resolved) {
      return { ok: true, data: { status: "not_configured" } };
    }

    provider = resolved.provider;

    const result = await generateDrillFeedback({
      model: resolved.model,
      question: session.question,
      answer: session.answer,
      stories: session.questionId
        ? await listLinkedStories(db, user.id, session.questionId)
        : [],
      language: session.language,
    });
    const feedback: StoredFeedback = {
      promptVersion: DRILL_FEEDBACK_PROMPT_VERSION,
      provider: resolved.provider,
      model: resolved.modelId,
      result,
    };

    await saveTurnFeedback(db, user.id, session.answerTurnId, feedback);

    return { ok: true, data: { status: "ready", feedback } };
  } catch (error) {
    return {
      ok: false,
      message: reportAiError(error, { where: "drill_feedback", provider })
        .message,
    };
  }
}

// Saves the follow-up question of a drill's feedback to the question bank.
// The text comes from the feedback stored on the server, so the client cannot
// pass off its own text as a question from practice.
export async function saveFollowUpQuestion(
  sessionId: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = sessionIdSchema.safeParse(sessionId);

  if (!parsed.success) {
    return { ok: false, message: SESSION_NOT_FOUND_MESSAGE };
  }

  const session = await findDrillSession(db, user.id, parsed.data);
  const stored = storedFeedbackSchema.safeParse(session?.feedback);

  if (!session || !stored.success) {
    return { ok: false, message: "Belum ada masukan untuk sesi ini." };
  }

  const text = stored.data.result.followUpQuestion.trim();

  if (text === "") {
    return { ok: false, message: "Tidak ada pertanyaan lanjutan." };
  }

  const added = await addFollowUpQuestion(db, user.id, {
    text,
    originQuestionId: session.questionId,
  });

  if (added.status === "duplicate") {
    return {
      ok: false,
      message: "Pertanyaan itu sudah ada di bank pertanyaanmu.",
    };
  }

  updateTag(`questions:${user.id}`);

  return { ok: true, data: undefined };
}

// --- Simulation -----------------------------------------------------------

const SESSION_CLOSED_MESSAGE = "Sesi ini sudah berakhir.";

// Starts a simulation and returns its id. Nothing is asked of a provider yet:
// the interviewer's first turn is requested from the session page.
export async function startSimulation(
  input: unknown,
): Promise<ActionResult<{ sessionId: string }>> {
  const user = await requireUser();
  const parsed = simulationSettingsSchema.safeParse(input);

  if (!parsed.success) {
    return invalidResult(parsed.error);
  }

  // A simulation is a conversation with a model, so unlike a drill it cannot
  // start without a key.
  if (!(await findActiveProvider(db, user.id))) {
    return { ok: false, message: AI_ERROR_MESSAGES.not_configured };
  }

  const { duration, ...settings } = parsed.data;
  const session = await createSimulationSession(db, user.id, {
    ...settings,
    maxTurns: DURATION_TURNS[duration],
  });

  if (!session) {
    return {
      ok: false,
      message: "Lamaran tidak ditemukan.",
      fieldErrors: { applicationId: ["Lamaran tidak ditemukan"] },
    };
  }

  updateTag(`practice:${user.id}`);

  return { ok: true, data: session };
}

// Saves what the candidate said. The reply is asked for separately, so an
// answer is never lost to a provider that fails. Whether the candidate may
// speak at all is decided from the database, turn limit included.
export async function sendSimulationTurn(
  input: unknown,
): Promise<ActionResult<{ turn: SavedTurn }>> {
  const user = await requireUser();
  const parsed = simulationTurnSchema.safeParse(input);

  if (!parsed.success) {
    return invalidResult(parsed.error);
  }

  const { sessionId, ...turn } = parsed.data;
  const outcome = await appendCandidateTurn(
    db,
    user.id,
    sessionId,
    turn,
    Date.now(),
  );

  switch (outcome.status) {
    case "saved":
      // The history reads how recently a session was touched.
      updateTag(`practice:${user.id}`);

      return { ok: true, data: { turn: outcome.turn } };
    case "not_found":
      return { ok: false, message: SESSION_NOT_FOUND_MESSAGE };
    case "closed":
      return { ok: false, message: SESSION_CLOSED_MESSAGE };
    case "waiting":
      return {
        ok: false,
        message: "Interviewer belum menjawab giliranmu yang terakhir.",
      };
    case "no_controls_left":
      return {
        ok: false,
        message:
          "Permintaan ini sudah dipakai beberapa kali di sesi ini. Lanjutkan dengan jawabanmu, tidak perlu terburu-buru.",
      };
  }
}

export type ReplyStart =
  | { status: "streaming"; events: ReadableStream<ReplyEvent> }
  // Nothing to stream: the page reloads what the server has.
  | { status: "not_found" | "closed" | "idle" }
  // Having no key is an ordinary state, as in a drill.
  | { status: "not_configured" }
  | { status: "error"; message: string };

// Runs a turn to its end whether or not anyone is still reading: a reply the
// user closed the tab on is saved all the same. Writes are not awaited, so a
// reader that stopped reading does not hold the turn back.
async function pump(
  events: AsyncIterable<ReplyEvent>,
  writer: WritableStreamDefaultWriter<ReplyEvent>,
) {
  const send = (event: ReplyEvent) => {
    writer.write(event).catch(() => {});
  };

  try {
    for await (const event of events) {
      send(event);
    }
  } catch {
    // Not a provider error (those arrive as events): the save failed.
    console.error("[practice]", { where: "simulation_reply" });
    send({ type: "error", message: "Balasan gagal disimpan. Coba lagi." });
  }

  writer.close().catch(() => {});
}

// The interviewer's next turn, streamed. The session, everything said in it
// and the job it is for are read from the database: the client sends an id and
// nothing else. The stream carries text as it is written, then the saved turn
// or a message; the SDK's own error never leaves the server.
export async function streamInterviewerReply(
  sessionId: unknown,
): Promise<ReplyStart> {
  const user = await requireUser();
  const parsed = sessionIdSchema.safeParse(sessionId);

  if (!parsed.success) {
    return { status: "not_found" };
  }

  const prepared = await prepareInterviewerTurn(
    db,
    user.id,
    parsed.data,
    Date.now(),
  );

  if (prepared.status !== "ready") {
    return { status: prepared.status };
  }

  let resolved;

  try {
    resolved = await getModelForUser(db, user.id);
  } catch (error) {
    return {
      status: "error",
      message: reportAiError(error, { where: "simulation_reply" }).message,
    };
  }

  if (!resolved) {
    return { status: "not_configured" };
  }

  const { readable, writable } = new TransformStream<ReplyEvent, ReplyEvent>();
  const work = pump(
    streamInterviewerTurn(db, user.id, prepared.turn, resolved),
    writable.getWriter(),
  );

  // Keeps the function alive until the turn is saved.
  after(() => work);

  return { status: "streaming", events: readable };
}

// Ends a simulation before its last turn. A session with at least one answer
// is completed and can be summarized; one with none is marked abandoned.
export async function endSimulationSession(
  sessionId: unknown,
): Promise<ActionResult<{ status: PracticeSessionStatus }>> {
  const user = await requireUser();
  const parsed = sessionIdSchema.safeParse(sessionId);
  const ended = parsed.success
    ? await endSimulation(db, user.id, parsed.data)
    : null;

  if (!ended) {
    return { ok: false, message: SESSION_NOT_FOUND_MESSAGE };
  }

  updateTag(`practice:${user.id}`);

  return { ok: true, data: ended };
}

export type SummaryOutcome =
  | { status: "ready"; view: SummaryView }
  | { status: "not_configured" }
  // Nothing was answered, so there is nothing to summarize.
  | { status: "empty" };

// The summary of a finished simulation. One that was already written is
// returned as it is: asking twice does not bill the user twice. The session,
// the job and the stories are read from the database.
export async function requestSimulationSummary(
  sessionId: unknown,
): Promise<ActionResult<SummaryOutcome>> {
  const user = await requireUser();
  const parsed = sessionIdSchema.safeParse(sessionId);
  const session = parsed.success
    ? await findSimulation(db, user.id, parsed.data)
    : null;

  if (!session) {
    return { ok: false, message: SESSION_NOT_FOUND_MESSAGE };
  }

  const stored = storedSummarySchema.safeParse(session.summary);

  if (stored.success) {
    return {
      ok: true,
      data: {
        status: "ready",
        view: await describeSummary(db, user.id, stored.data.result),
      },
    };
  }

  if (session.status === "in_progress") {
    return { ok: false, message: "Sesi ini belum diakhiri." };
  }

  if (countAnswers(session.turns) === 0) {
    return { ok: true, data: { status: "empty" } };
  }

  let provider: AiProvider | undefined;

  try {
    const resolved = await getModelForUser(db, user.id);

    if (!resolved) {
      return { ok: true, data: { status: "not_configured" } };
    }

    provider = resolved.provider;

    const [application, stories] = await Promise.all([
      session.applicationId
        ? findApplicationContext(db, user.id, session.applicationId, Date.now())
        : null,
      listStoriesForSummary(db, user.id),
    ]);
    const summary: StoredSummary = {
      promptVersion: SIMULATION_SUMMARY_PROMPT_VERSION,
      provider: resolved.provider,
      model: resolved.modelId,
      result: await generateSimulationSummary({
        model: resolved.model,
        interviewType: session.interviewType,
        level: session.level,
        language: session.language,
        application,
        turns: session.turns,
        stories,
      }),
    };

    await saveSessionSummary(db, user.id, session.id, summary);
    updateTag(`practice:${user.id}`);

    return {
      ok: true,
      data: {
        status: "ready",
        view: await describeSummary(db, user.id, summary.result),
      },
    };
  } catch (error) {
    return {
      ok: false,
      message: reportAiError(error, { where: "simulation_summary", provider })
        .message,
    };
  }
}

// The stored summary of the user's simulation, or null. What the two actions
// below save comes from here, never from the client, which only says which
// item it means.
async function findSummarizedSession(userId: string, sessionId: unknown) {
  const parsed = sessionIdSchema.safeParse(sessionId);
  const session = parsed.success
    ? await findSimulation(db, userId, parsed.data)
    : null;
  const stored = storedSummarySchema.safeParse(session?.summary);

  return session && stored.success
    ? { session, summary: stored.data.result }
    : null;
}

const NO_SUMMARY_MESSAGE = "Belum ada ringkasan untuk sesi ini.";

// Saves the chosen questions of a summary to the question bank, linked to the
// application the session was for. Questions the bank already has are skipped.
export async function saveSessionQuestions(
  sessionId: unknown,
  indexes: unknown,
): Promise<
  ActionResult<{ created: number; skipped: number; view: SummaryView }>
> {
  const user = await requireUser();
  const parsed = summaryIndexesSchema.safeParse(indexes);

  if (!parsed.success) {
    return { ok: false, message: "Pilih setidaknya satu pertanyaan." };
  }

  const found = await findSummarizedSession(user.id, sessionId);

  if (!found) {
    return { ok: false, message: NO_SUMMARY_MESSAGE };
  }

  const texts = [...new Set(parsed.data)].flatMap((index) => {
    const text = found.summary.extractedQuestions[index];

    return text ? [text] : [];
  });

  if (texts.length === 0) {
    return { ok: false, message: "Pertanyaan tidak ditemukan." };
  }

  const saved = await addSessionQuestions(db, user.id, {
    texts,
    category: INTERVIEW_TYPE_CATEGORIES[found.session.interviewType],
    applicationId: found.session.applicationId,
  });

  updateTag(`questions:${user.id}`);

  return {
    ok: true,
    data: {
      ...saved,
      view: await describeSummary(db, user.id, found.summary),
    },
  };
}

// Links a story to the question a suggestion is about, adding the question to
// the bank when it is not there yet. The story is the one the summary names,
// or one the user just wrote for it; either way it must be theirs.
export async function applyStorySuggestion(
  sessionId: unknown,
  index: unknown,
  storyId?: unknown,
): Promise<ActionResult<{ view: SummaryView }>> {
  const user = await requireUser();
  const position = summaryIndexSchema.safeParse(index);
  const written = storyIdSchema.safeParse(storyId);
  const found = await findSummarizedSession(user.id, sessionId);

  if (!found) {
    return { ok: false, message: NO_SUMMARY_MESSAGE };
  }

  const suggestion = position.success
    ? found.summary.storySuggestions[position.data]
    : undefined;
  const chosen = written.success ? written.data : suggestion?.storyId;

  if (!suggestion || !chosen) {
    return { ok: false, message: "Saran cerita tidak ditemukan." };
  }

  const linked = await linkStoryToSessionQuestion(db, user.id, {
    text: suggestion.question,
    storyId: chosen,
    category: INTERVIEW_TYPE_CATEGORIES[found.session.interviewType],
    applicationId: found.session.applicationId,
  });

  if (linked.status === "story_not_found") {
    return { ok: false, message: "Cerita tidak ditemukan." };
  }

  updateTag(`questions:${user.id}`);
  updateTag(`stories:${user.id}`);

  return {
    ok: true,
    data: { view: await describeSummary(db, user.id, found.summary) },
  };
}
