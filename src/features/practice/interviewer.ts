import { NoOutputGeneratedError, streamText } from "ai";
import { reportAiError } from "@/features/ai/errors";
import type { ResolvedModel } from "@/features/ai/model";
import { AI_PROVIDER_OPTIONS } from "@/features/ai/provider-options";
import type { Database } from "@/features/questions/data";
import {
  appendInterviewerTurn,
  findApplicationContext,
  findSimulation,
} from "./data";
import {
  buildInterviewerPrompt,
  INTERVIEWER_PROMPT_VERSION,
} from "./prompts/interviewer";
import { isStale, nextStep } from "./simulation";

// Shorter than the page's maxDuration. A reply is a few sentences, so a
// provider that has not started within the first limit is not going to.
const REPLY_TIMEOUT = { totalMs: 45_000, firstChunkMs: 20_000 };

// A reply is short; the rest is slack for models that spend output tokens on
// thinking.
const REPLY_MAX_OUTPUT_TOKENS = 1500;

export type SavedTurn = { id: string; position: number; content: string };

export type ReplyEvent =
  | { type: "delta"; text: string }
  // The reply is saved. `closed` when it ended the session.
  | { type: "done"; turn: SavedTurn; closed: boolean }
  // Another request saved this turn first; what was written here is dropped.
  | { type: "superseded" }
  // Nothing was saved. The message is ready to show.
  | { type: "error"; message: string };

export type PendingTurn = {
  sessionId: string;
  position: number;
  closes: boolean;
  prompt: ReturnType<typeof buildInterviewerPrompt>;
};

// Works out what the interviewer says next, from the database alone: the
// session, everything said so far and the job it is for. Nothing here comes
// from the client.
export async function prepareInterviewerTurn(
  db: Database,
  userId: string,
  sessionId: string,
  now: number,
): Promise<
  | { status: "not_found" }
  // Over, or left alone for too long.
  | { status: "closed" }
  // The candidate speaks next: there is nothing to reply to.
  | { status: "idle" }
  | { status: "ready"; turn: PendingTurn }
> {
  const session = await findSimulation(db, userId, sessionId);

  if (!session) {
    return { status: "not_found" };
  }

  if (
    session.status !== "in_progress" ||
    isStale(session.lastActivityAt, now)
  ) {
    return { status: "closed" };
  }

  const step = nextStep(session.maxTurns, session.turns);

  if (step.actor === "none") {
    return { status: "closed" };
  }

  if (step.actor === "candidate") {
    return { status: "idle" };
  }

  return {
    status: "ready",
    turn: {
      sessionId,
      position: session.turns.length,
      closes: step.phase === "closing",
      prompt: buildInterviewerPrompt({
        interviewType: session.interviewType,
        level: session.level,
        tone: session.tone,
        language: session.language,
        application: session.applicationId
          ? await findApplicationContext(db, userId, session.applicationId, now)
          : null,
        turns: session.turns,
        step,
      }),
    },
  };
}

const aborted = () =>
  Object.assign(new Error("The reply was aborted"), { name: "AbortError" });

// Streams one turn of the interviewer and saves it once it is whole. A reply
// that fails partway is not saved: the session stays where it was and the
// same turn can be asked for again. The SDK's error never leaves this
// function; reportAiError turns it into a message and a line of log.
export async function* streamInterviewerTurn(
  db: Database,
  userId: string,
  pending: PendingTurn,
  { model, provider, modelId }: ResolvedModel,
): AsyncGenerator<ReplyEvent> {
  let failure: unknown;
  let text = "";

  try {
    const result = streamText({
      model,
      ...pending.prompt,
      providerOptions: AI_PROVIDER_OPTIONS,
      maxOutputTokens: REPLY_MAX_OUTPUT_TOKENS,
      maxRetries: 1,
      timeout: REPLY_TIMEOUT,
      // Without a handler the SDK prints the error itself, and that error
      // carries the request body.
      onError: ({ error }) => {
        failure ??= error;
      },
    });

    for await (const part of result.stream) {
      if (part.type === "text-delta") {
        text += part.text;
        yield { type: "delta", text: part.text };
      } else if (part.type === "error") {
        failure ??= part.error;
      } else if (part.type === "abort") {
        failure ??= aborted();
      }
    }
  } catch (error) {
    failure ??= error;
  }

  const content = text.trim();

  if (!failure && content === "") {
    failure = new NoOutputGeneratedError();
  }

  if (failure) {
    yield {
      type: "error",
      message: reportAiError(failure, { where: "simulation_reply", provider })
        .message,
    };

    return;
  }

  const turn = await appendInterviewerTurn(db, userId, pending.sessionId, {
    position: pending.position,
    content,
    origin: {
      promptVersion: INTERVIEWER_PROMPT_VERSION,
      provider,
      model: modelId,
    },
    closes: pending.closes,
  });

  yield turn
    ? { type: "done", turn, closed: pending.closes }
    : { type: "superseded" };
}
