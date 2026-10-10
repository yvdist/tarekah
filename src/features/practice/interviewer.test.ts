import { createDeepSeek } from "@ai-sdk/deepseek";
import { APICallError, simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { eq } from "drizzle-orm";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { practiceSessions, practiceTurns } from "@/db/schema";
import { AI_ERROR_MESSAGES } from "@/features/ai/errors";
import {
  createFakeModel,
  FAKE_INTERVIEWER_LINES,
} from "@/features/ai/fake-model";
import type { ResolvedModel } from "@/features/ai/model";
import { createTestDb, createUser, type TestDb } from "@/test/db";
import {
  appendCandidateTurn,
  createSimulationSession,
  endSimulation,
  findSimulation,
} from "./data";
import {
  prepareInterviewerTurn,
  type ReplyEvent,
  streamInterviewerTurn,
} from "./interviewer";
import { INTERVIEWER_PROMPT_VERSION } from "./prompts/interviewer";
import { ABANDON_AFTER_HOURS } from "./simulation";

let db: TestDb;
let close: () => Promise<void>;
let userCount = 0;

beforeAll(async () => ({ db, close } = await createTestDb()));
afterAll(() => close());
afterEach(() => vi.restoreAllMocks());

const newUser = () => createUser(db, `interviewer-${++userCount}`);

async function newSimulation(userId: string, maxTurns = 6) {
  const created = await createSimulationSession(db, userId, {
    applicationId: null,
    interviewType: "behavioral",
    level: "mid",
    tone: "friendly",
    language: "id",
    maxTurns,
  });

  if (!created) {
    throw new Error("The simulation was not created");
  }

  return created.sessionId;
}

type Stream = NonNullable<
  ConstructorParameters<typeof MockLanguageModelV4>[0]
>["doStream"];
type Chunks = Parameters<typeof simulateReadableStream>[0]["chunks"];

const FINISH = {
  type: "finish",
  finishReason: { unified: "stop", raw: undefined },
  usage: {
    inputTokens: {
      total: 1,
      noCache: 1,
      cacheRead: undefined,
      cacheWrite: undefined,
    },
    outputTokens: { total: 1, text: 1, reasoning: undefined },
  },
} as const;

const saying = (...deltas: string[]): Chunks => [
  { type: "stream-start", warnings: [] },
  { type: "text-start", id: "t" },
  ...deltas.map((delta) => ({ type: "text-delta", id: "t", delta })),
  { type: "text-end", id: "t" },
  FINISH,
];

// A model whose calls answer, in order, with the given chunks or failure.
function modelStreaming(...replies: Array<Chunks | Error>) {
  const calls: unknown[] = [];
  const doStream: Stream = async (options) => {
    const reply = replies[calls.length];

    calls.push(options);

    if (reply instanceof Error) {
      throw reply;
    }

    return {
      stream: simulateReadableStream({ chunks: reply }),
    } as Awaited<ReturnType<Extract<Stream, (...args: never[]) => unknown>>>;
  };

  return { calls, model: new MockLanguageModelV4({ doStream }) };
}

const resolved = (model: ResolvedModel["model"]): ResolvedModel => ({
  provider: "deepseek",
  modelId: "deepseek-flash",
  model,
});

// One turn of the interviewer, the way the action runs it.
async function reply(
  userId: string,
  sessionId: string,
  model: ResolvedModel["model"],
) {
  const prepared = await prepareInterviewerTurn(
    db,
    userId,
    sessionId,
    Date.now(),
  );

  if (prepared.status !== "ready") {
    return prepared.status;
  }

  const events: ReplyEvent[] = [];

  for await (const event of streamInterviewerTurn(
    db,
    userId,
    prepared.turn,
    resolved(model),
  )) {
    events.push(event);
  }

  return events;
}

const answer = (userId: string, sessionId: string, text: string) =>
  appendCandidateTurn(
    db,
    userId,
    sessionId,
    { kind: "answer", text },
    Date.now(),
  );

const turnsOf = async (userId: string, sessionId: string) =>
  (await findSimulation(db, userId, sessionId))?.turns.map(
    ({ role, content }) => ({ role, content }),
  );

describe("a simulation, turn by turn", () => {
  it("streams each reply, saves it and reads the session back for the next", async () => {
    const userId = await newUser();
    const sessionId = await newSimulation(userId);
    const { model, calls } = modelStreaming(
      saying("Halo. ", "Ceritakan ", "tentang dirimu."),
      saying("Apa yang paling kamu banggakan?"),
      saying("Ceritakan satu kegagalan."),
    );

    expect(await reply(userId, sessionId, model)).toEqual([
      { type: "delta", text: "Halo. " },
      { type: "delta", text: "Ceritakan " },
      { type: "delta", text: "tentang dirimu." },
      {
        type: "done",
        turn: {
          id: expect.any(String),
          position: 0,
          content: "Halo. Ceritakan tentang dirimu.",
        },
        closed: false,
      },
    ]);

    await answer(userId, sessionId, "Saya backend engineer.");
    await reply(userId, sessionId, model);
    await answer(userId, sessionId, "Migrasi tanpa downtime.");
    await reply(userId, sessionId, model);

    expect(await turnsOf(userId, sessionId)).toEqual([
      { role: "interviewer", content: "Halo. Ceritakan tentang dirimu." },
      { role: "candidate", content: "Saya backend engineer." },
      { role: "interviewer", content: "Apa yang paling kamu banggakan?" },
      { role: "candidate", content: "Migrasi tanpa downtime." },
      { role: "interviewer", content: "Ceritakan satu kegagalan." },
    ]);

    // The third call carries the whole session, answers fenced, and the
    // server's word on where the session stands.
    const third = JSON.stringify(calls[2]);

    expect(third).toContain("<answer>\\nSaya backend engineer.\\n</answer>");
    expect(third).toContain("<answer>\\nMigrasi tanpa downtime.\\n</answer>");
    expect(third).toContain("Apa yang paling kamu banggakan?");
    expect(third).toContain("You have 3 questions left");
  });

  it("stores what produced each turn", async () => {
    const userId = await newUser();
    const sessionId = await newSimulation(userId);

    await reply(userId, sessionId, modelStreaming(saying("Halo.")).model);

    const [turn] = await db
      .select()
      .from(practiceTurns)
      .where(eq(practiceTurns.sessionId, sessionId));

    expect(turn.feedback).toEqual({
      promptVersion: INTERVIEWER_PROMPT_VERSION,
      provider: "deepseek",
      model: "deepseek-flash",
    });
  });

  it("closes the session with the turn after the last answer", async () => {
    const userId = await newUser();
    const sessionId = await newSimulation(userId, 1);
    const { model, calls } = modelStreaming(
      saying("Ada yang ingin kamu tanyakan?"),
      saying("Terima kasih, sampai jumpa."),
    );

    await reply(userId, sessionId, model);
    await answer(userId, sessionId, "Tidak ada, terima kasih.");

    expect(await reply(userId, sessionId, model)).toEqual([
      { type: "delta", text: "Terima kasih, sampai jumpa." },
      { type: "done", turn: expect.anything(), closed: true },
    ]);
    expect(JSON.stringify(calls[1])).toContain("Do not ask another question.");

    const [session] = await db
      .select()
      .from(practiceSessions)
      .where(eq(practiceSessions.id, sessionId));

    expect(session).toMatchObject({
      status: "completed",
      endedAt: expect.any(Date),
    });
    expect(await reply(userId, sessionId, model)).toBe("closed");
    expect(calls).toHaveLength(2);
  });
});

describe("a reply that fails", () => {
  it("saves nothing when the stream breaks, and the same turn can be asked again", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const userId = await newUser();
    const sessionId = await newSimulation(userId);
    const secret = "sk-leaked-key quoting the candidate's answer";
    const { model } = modelStreaming(
      saying("Halo. Ceritakan tentang dirimu."),
      [
        { type: "stream-start", warnings: [] },
        { type: "text-start", id: "t" },
        { type: "text-delta", id: "t", delta: "Baik, lalu" },
        { type: "error", error: new Error(secret) },
      ],
      saying("Apa yang paling kamu banggakan?"),
    );

    await reply(userId, sessionId, model);
    await answer(userId, sessionId, "Saya backend engineer.");

    const failed = await reply(userId, sessionId, model);

    expect(failed).toEqual([
      { type: "delta", text: "Baik, lalu" },
      { type: "error", message: expect.any(String) },
    ]);
    expect(Object.values(AI_ERROR_MESSAGES)).toContain(
      failed instanceof Array && failed[1].type === "error"
        ? failed[1].message
        : "",
    );
    expect(await turnsOf(userId, sessionId)).toHaveLength(2);

    // One line of log: where, a code, the provider and a status. Not the
    // error, which can quote the key or the answer.
    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0]).toEqual([
      "[ai]",
      {
        where: "simulation_reply",
        code: expect.any(String),
        provider: "deepseek",
        status: undefined,
      },
    ]);
    expect(JSON.stringify(log.mock.calls)).not.toContain("sk-leaked");

    expect(await reply(userId, sessionId, model)).toEqual([
      { type: "delta", text: "Apa yang paling kamu banggakan?" },
      { type: "done", turn: expect.anything(), closed: false },
    ]);
    expect(await turnsOf(userId, sessionId)).toHaveLength(3);
    expect((await findSimulation(db, userId, sessionId))?.status).toBe(
      "in_progress",
    );
  });

  it("reads a refused request as what the provider meant", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const userId = await newUser();
    const sessionId = await newSimulation(userId);
    const { model } = modelStreaming(
      new APICallError({
        message: "invalid x-api-key",
        url: "https://api.example.com/v1/messages",
        requestBodyValues: { messages: "the prompt" },
        statusCode: 401,
        isRetryable: false,
        data: { error: { type: "authentication_error" } },
      }),
    );

    expect(await reply(userId, sessionId, model)).toEqual([
      { type: "error", message: AI_ERROR_MESSAGES.invalid_key },
    ]);
    expect(log.mock.calls[0][1]).toMatchObject({
      code: "invalid_key",
      status: 401,
    });
    expect(await turnsOf(userId, sessionId)).toEqual([]);
  });

  it("does not save an empty reply", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const userId = await newUser();
    const sessionId = await newSimulation(userId);

    expect(
      await reply(userId, sessionId, modelStreaming(saying("  ")).model),
    ).toEqual([
      { type: "delta", text: "  " },
      { type: "error", message: AI_ERROR_MESSAGES.bad_output },
    ]);
    expect(await turnsOf(userId, sessionId)).toEqual([]);
  });

  it("drops a reply another request already saved", async () => {
    const userId = await newUser();
    const sessionId = await newSimulation(userId);
    const now = Date.now();
    const first = await prepareInterviewerTurn(db, userId, sessionId, now);
    const second = await prepareInterviewerTurn(db, userId, sessionId, now);

    if (first.status !== "ready" || second.status !== "ready") {
      throw new Error("Both turns should be ready");
    }

    const run = async (turn: typeof first.turn, text: string) => {
      const events: ReplyEvent[] = [];
      const { model } = modelStreaming(saying(text));

      for await (const event of streamInterviewerTurn(
        db,
        userId,
        turn,
        resolved(model),
      )) {
        events.push(event);
      }

      return events.at(-1);
    };

    expect(await run(first.turn, "Yang pertama.")).toMatchObject({
      type: "done",
    });
    expect(await run(second.turn, "Yang kedua.")).toEqual({
      type: "superseded",
    });
    expect(await turnsOf(userId, sessionId)).toEqual([
      { role: "interviewer", content: "Yang pertama." },
    ]);
  });
});

describe("prepareInterviewerTurn", () => {
  const prepare = (userId: string, sessionId: string, now = Date.now()) =>
    prepareInterviewerTurn(db, userId, sessionId, now);

  it("has nothing to say while the candidate is next", async () => {
    const userId = await newUser();
    const sessionId = await newSimulation(userId);

    await reply(userId, sessionId, modelStreaming(saying("Halo.")).model);

    expect(await prepare(userId, sessionId)).toEqual({ status: "idle" });
  });

  it("does not speak in a session that ended or was left alone", async () => {
    const userId = await newUser();
    const ended = await newSimulation(userId);
    const left = await newSimulation(userId);

    await endSimulation(db, userId, ended);

    expect(await prepare(userId, ended)).toEqual({ status: "closed" });
    expect(
      await prepare(
        userId,
        left,
        Date.now() + (ABANDON_AFTER_HOURS + 1) * 60 * 60 * 1000,
      ),
    ).toEqual({ status: "closed" });
  });

  it("hides another user's session", async () => {
    const sessionId = await newSimulation(await newUser());

    expect(await prepare(await newUser(), sessionId)).toEqual({
      status: "not_found",
    });
  });
});

describe("providers", () => {
  it("streams the canned lines of the fake provider", async () => {
    const userId = await newUser();
    const sessionId = await newSimulation(userId);
    const events = await reply(userId, sessionId, createFakeModel("fake"));

    expect(events.at(-1)).toMatchObject({
      type: "done",
      turn: { content: FAKE_INTERVIEWER_LINES[0] },
    });
    expect(events.length).toBeGreaterThan(3);
  });

  // DeepSeek thinks unless told not to. This checks the request it is actually
  // sent; the fetch is a stand-in and nothing reaches the network.
  it("asks DeepSeek for a stream with thinking off", async () => {
    const requests: Array<Record<string, unknown>> = [];
    const chunk = (delta: object, finish: string | null) =>
      `data: ${JSON.stringify({
        id: "chatcmpl-1",
        created: 1,
        model: "deepseek-flash",
        choices: [{ index: 0, delta, finish_reason: finish }],
      })}\n\n`;
    const deepseek = createDeepSeek({
      apiKey: "sk-not-a-real-key",
      fetch: async (_, init) => {
        requests.push(JSON.parse(String(init?.body)));

        return new Response(
          [
            chunk({ role: "assistant", content: "Halo. " }, null),
            chunk({ content: "Ceritakan tentang dirimu." }, "stop"),
            "data: [DONE]\n\n",
          ].join(""),
          { headers: { "Content-Type": "text/event-stream" } },
        );
      },
    });
    const userId = await newUser();
    const sessionId = await newSimulation(userId);
    const events = await reply(userId, sessionId, deepseek("deepseek-flash"));

    expect(events.at(-1)).toMatchObject({
      type: "done",
      turn: { content: "Halo. Ceritakan tentang dirimu." },
    });
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      model: "deepseek-flash",
      stream: true,
      thinking: { type: "disabled" },
      max_tokens: 1500,
    });
    expect(JSON.stringify(requests[0].messages)).toContain(
      "You are an interviewer running a practice job interview.",
    );
  });
});
