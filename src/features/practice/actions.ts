"use server";

import { updateTag } from "next/cache";
import { db } from "@/db";
import type { AiProvider } from "@/db/schema/enum-values";
import { reportAiError } from "@/features/ai/errors";
import { getModelForUser } from "@/features/ai/model";
import { type ActionResult, invalidResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth";
import {
  addFollowUpQuestion,
  createDrillSession,
  findDrillSession,
  listLinkedStories,
  saveTurnFeedback,
} from "./data";
import { generateDrillFeedback } from "./feedback";
import { DRILL_FEEDBACK_PROMPT_VERSION } from "./prompts/drill-feedback";
import {
  drillAnswerSchema,
  sessionIdSchema,
  type StoredFeedback,
  storedFeedbackSchema,
} from "./schemas";

const SESSION_NOT_FOUND_MESSAGE = "Sesi latihan tidak ditemukan.";

// Saves one answer as a completed drill. It works without an AI key: feedback
// is asked for separately, with the id this returns.
//
// No tag is updated: nothing cached reads practice sessions yet.
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
