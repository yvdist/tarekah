"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Panel } from "@/components/panel";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import type { PracticeSessionStatus } from "@/db/schema/enum-values";
import { describedBy } from "@/lib/form-errors";
import {
  endSimulationSession,
  requestSimulationSummary,
  sendSimulationTurn,
  streamInterviewerReply,
  type SummaryOutcome,
} from "../actions";
import type { SummaryView as Summary } from "../data";
import type { SimulationDetail } from "../queries";
import {
  ANSWER_MAX_LENGTH,
  type SimulationAnswerInput,
  simulationAnswerSchema,
} from "../schemas";
import {
  ABANDON_AFTER_HOURS,
  CONTROL_KINDS,
  CONTROL_PHRASES,
  type ControlKind,
  countAnswers,
  mergeTurns,
  nextStep,
} from "../simulation";
import { AiInvite } from "./ai-invite";
import { SummaryView } from "./summary-view";
import { Transcript, type TranscriptTurn } from "./transcript";

type Turn = TranscriptTurn & { id: string };

// Where the interviewer's turn stands.
type Reply =
  | { kind: "idle" }
  | { kind: "streaming"; text: string }
  | { kind: "error"; message: string }
  | { kind: "not_configured" };

// Where the summary stands: what the server answered, or what this page is
// doing about it.
type SummaryState =
  | SummaryOutcome
  | { status: "none" }
  | { status: "loading" }
  | { status: "error"; message: string };

const REPLY_FAILED_MESSAGE = "Balasan interviewer gagal dimuat. Coba lagi.";

// One simulation: the conversation so far, whoever's turn it is, and the
// summary once it is over. The server decides whose turn it is and when the
// session ends; this reads that off the turns with the same rules and shows
// it. Every turn is saved before the next is asked for, so a reload, a closed
// tab or a provider that fails loses nothing.
export function Simulation({ session }: { session: SimulationDetail }) {
  const id = useId();
  const router = useRouter();
  // Turns learned since the page was rendered: an answer just saved, a reply
  // just streamed.
  const [learned, setLearned] = useState<Turn[]>([]);
  const [reply, setReply] = useState<Reply>({ kind: "idle" });
  const [sending, setSending] = useState(false);
  const [endedAs, setEndedAs] = useState<PracticeSessionStatus | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [summary, setSummary] = useState<SummaryState>(
    session.summary
      ? { status: "ready", view: session.summary }
      : { status: "none" },
  );
  const [spoken, setSpoken] = useState("");
  const answerNext = useRef(false);
  const summaryPanel = useRef<HTMLDivElement>(null);
  const form = useForm<SimulationAnswerInput>({
    resolver: zodResolver(simulationAnswerSchema),
    defaultValues: { text: "" },
  });
  const { errors } = form.formState;
  const length = useWatch({ control: form.control, name: "text" }).length;

  const turns = mergeTurns<Turn>(session.turns, learned);
  const step = nextStep(session.maxTurns, turns);
  const answers = countAnswers(turns);
  // What is stored, here or a moment ago from here. A session left alone for
  // too long still reads "in progress" in the database: nothing more can be
  // said in it, but it can be ended.
  const status = endedAs ?? session.stored;
  const stale =
    endedAs === null &&
    session.stored === "in_progress" &&
    session.status === "abandoned";
  // The closing turn completes the session on the server; the turns say so
  // before the next render does.
  const over = status !== "in_progress" || step.actor === "none";
  const streaming = reply.kind === "streaming";
  const busy = sending || streaming;
  const turnCount = turns.length;

  // After a reply, the answer box is where the user goes next.
  useEffect(() => {
    if (answerNext.current) {
      answerNext.current = false;
      form.setFocus("text");
    }
  }, [turnCount, form]);

  async function loadSummary() {
    setSummary({ status: "loading" });
    summaryPanel.current?.focus();

    try {
      const result = await requestSimulationSummary(session.id);

      setSummary(
        result.ok ? result.data : { status: "error", message: result.message },
      );
    } catch {
      setSummary({
        status: "error",
        message: "Ringkasan gagal diminta. Coba lagi.",
      });
    }
  }

  // Not in a transition: the text has to paint as it arrives.
  async function requestReply() {
    setReply({ kind: "streaming", text: "" });

    try {
      const start = await streamInterviewerReply(session.id);

      if (start.status === "not_configured") {
        setReply({ kind: "not_configured" });
        return;
      }

      if (start.status === "error") {
        setReply({ kind: "error", message: start.message });
        return;
      }

      if (start.status !== "streaming") {
        // The server is somewhere else than this page thinks: read it again.
        setReply({ kind: "idle" });
        router.refresh();
        return;
      }

      const reader = start.events.getReader();

      for (;;) {
        const { done, value: event } = await reader.read();

        if (done) {
          break;
        }

        if (event.type === "delta") {
          setReply((current) =>
            current.kind === "streaming"
              ? { kind: "streaming", text: current.text + event.text }
              : current,
          );
        } else if (event.type === "done") {
          answerNext.current = !event.closed;
          setLearned((current) => [
            ...current,
            { ...event.turn, role: "interviewer" },
          ]);
          setSpoken(event.turn.content);
          setReply({ kind: "idle" });

          if (event.closed) {
            setEndedAs("completed");
            await loadSummary();
          }

          return;
        } else if (event.type === "superseded") {
          setReply({ kind: "idle" });
          router.refresh();
          return;
        } else {
          setReply({ kind: "error", message: event.message });
          return;
        }
      }

      // The stream ended without saying how.
      setReply({ kind: "error", message: REPLY_FAILED_MESSAGE });
    } catch {
      setReply({ kind: "error", message: REPLY_FAILED_MESSAGE });
    }
  }

  async function send(
    turn: { kind: "answer"; text: string } | { kind: ControlKind },
  ) {
    setSending(true);

    try {
      const saved = await sendSimulationTurn({
        sessionId: session.id,
        ...turn,
      });

      if (!saved.ok) {
        const message = saved.fieldErrors?.text?.[0];

        if (message) {
          form.setError("text", { message });
        } else {
          router.refresh();
        }

        toast.error(saved.message);
        return;
      }

      setLearned((current) => [
        ...current,
        { ...saved.data.turn, role: "candidate" },
      ]);

      if (turn.kind === "answer") {
        form.reset();
      }
    } catch {
      toast.error("Jawaban gagal dikirim. Coba lagi.");
      return;
    } finally {
      setSending(false);
    }

    await requestReply();
  }

  async function end() {
    setSending(true);

    try {
      const ended = await endSimulationSession(session.id);

      if (!ended.ok) {
        toast.error(ended.message);
        return;
      }

      setConfirmEnd(false);
      setEndedAs(ended.data.status);

      if (ended.data.status === "completed") {
        await loadSummary();
      }
    } catch {
      toast.error("Sesi gagal diakhiri. Coba lagi.");
    } finally {
      setSending(false);
    }
  }

  const conversation = (
    <Panel
      title="Percakapan"
      hint={
        turnCount > 0 ? (
          <>
            <span className="font-figure">{answers}</span> dari{" "}
            <span className="font-figure">{session.maxTurns}</span> jawaban
          </>
        ) : undefined
      }
    >
      {turnCount > 0 || streaming ? (
        <Transcript
          turns={turns}
          streaming={streaming ? reply.text : undefined}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          Belum ada yang diucapkan di sesi ini.
        </p>
      )}
      <p className="sr-only" role="status">
        {streaming ? "Interviewer sedang menjawab." : spoken}
      </p>
    </Panel>
  );

  if (over) {
    return (
      <div className="flex flex-col gap-4">
        <div ref={summaryPanel} tabIndex={-1} className="outline-none">
          <Panel title="Ringkasan">
            <div aria-live="polite" aria-busy={summary.status === "loading"}>
              <SummaryArea
                sessionId={session.id}
                status={status}
                summary={summary}
                onRequest={loadSummary}
                onChange={(view) => setSummary({ status: "ready", view })}
              />
            </div>
          </Panel>
        </div>
        {conversation}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {conversation}

      <Panel
        title={
          stale
            ? "Sesi ditutup"
            : step.actor === "candidate"
              ? "Giliranmu"
              : "Interviewer"
        }
      >
        {stale ? (
          <div className="flex flex-col items-start gap-3 text-sm">
            <p>
              Sesi ini sudah lebih dari {ABANDON_AFTER_HOURS} jam tidak
              dilanjutkan, jadi ditutup di sini.{" "}
              {answers > 0
                ? "Yang sudah kamu jawab tetap bisa diringkas."
                : "Belum ada jawaban di dalamnya."}
            </p>
            {answers > 0 ? (
              <Button type="button" disabled={busy} onClick={end}>
                {sending ? "Mengakhiri…" : "Akhiri dan lihat ringkasan"}
              </Button>
            ) : (
              <Link
                href="/practice/simulation/new"
                className={buttonVariants({ variant: "outline" })}
              >
                Mulai simulasi baru
              </Link>
            )}
          </div>
        ) : reply.kind === "not_configured" ? (
          <AiInvite simulation />
        ) : reply.kind === "error" ? (
          <div className="flex flex-col items-start gap-3 text-sm">
            <p role="alert">
              {reply.message} Percakapanmu sudah tersimpan, jadi tidak ada yang
              perlu diulang.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={requestReply}>
                Coba lagi
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConfirmEnd(true)}
              >
                Akhiri sesi
              </Button>
            </div>
          </div>
        ) : streaming ? (
          <p className="text-sm text-muted-foreground">
            Interviewer sedang menjawab…
          </p>
        ) : step.actor === "interviewer" ? (
          <div className="flex flex-col items-start gap-3 text-sm">
            <p className="text-muted-foreground">
              {turnCount === 0
                ? "Tidak ada yang menilai di sini. Ambil napas dulu, lalu mulai saat kamu siap."
                : "Interviewer belum sempat menjawab giliranmu yang terakhir."}
            </p>
            <Button type="button" onClick={requestReply}>
              {turnCount === 0 ? "Mulai interview" : "Lanjutkan"}
            </Button>
          </div>
        ) : step.actor === "candidate" ? (
          <form
            onSubmit={form.handleSubmit(({ text }) =>
              send({ kind: "answer", text }),
            )}
            noValidate
          >
            <FieldGroup>
              <Field data-invalid={!!errors.text}>
                <FieldLabel htmlFor={`${id}-text`} className="sr-only">
                  Jawabanmu
                </FieldLabel>
                <Textarea
                  id={`${id}-text`}
                  aria-describedby={describedBy(
                    `${id}-text-description`,
                    !!errors.text && `${id}-text-error`,
                  )}
                  aria-required
                  rows={6}
                  className="min-h-36"
                  placeholder="Jawab seperti kamu mengucapkannya."
                  aria-invalid={!!errors.text}
                  disabled={busy}
                  {...form.register("text")}
                />
                <FieldDescription
                  id={`${id}-text-description`}
                  className="flex justify-between gap-4"
                >
                  <span>Jeda itu wajar. Tidak ada batas waktu.</span>
                  <span className="font-figure">
                    {length}/{ANSWER_MAX_LENGTH}
                  </span>
                </FieldDescription>
                <FieldError id={`${id}-text-error`} errors={[errors.text]} />
              </Field>

              <div className="flex flex-wrap items-center gap-2 border-t pt-5">
                {step.controlsLeft > 0
                  ? CONTROL_KINDS.map((kind) => (
                      <Button
                        key={kind}
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => send({ kind })}
                      >
                        {CONTROL_PHRASES[session.language][kind]}
                      </Button>
                    ))
                  : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => setConfirmEnd(true)}
                >
                  Akhiri sesi
                </Button>
                <Button type="submit" disabled={busy} className="ml-auto">
                  {sending ? "Mengirim…" : "Kirim jawaban"}
                </Button>
              </div>
            </FieldGroup>
          </form>
        ) : null}
      </Panel>

      <AlertDialog open={confirmEnd} onOpenChange={setConfirmEnd}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Akhiri sesi ini?</AlertDialogTitle>
            <AlertDialogDescription>
              {answers > 0
                ? "Sesi tidak bisa dilanjutkan lagi. Ringkasan disusun dari yang sudah kamu jawab."
                : "Belum ada jawaban, jadi sesi ini berakhir tanpa ringkasan. Kamu bisa mulai lagi kapan saja."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Batal</AlertDialogCancel>
            <Button disabled={sending} onClick={end}>
              {sending ? "Mengakhiri…" : "Akhiri sesi"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SummaryArea({
  sessionId,
  status,
  summary,
  onRequest,
  onChange,
}: {
  sessionId: string;
  status: PracticeSessionStatus;
  summary: SummaryState;
  onRequest: () => void;
  onChange: (view: Summary) => void;
}) {
  const again = (
    <Link
      href="/practice/simulation/new"
      className={buttonVariants({ variant: "outline", size: "sm" })}
    >
      Mulai simulasi baru
    </Link>
  );

  if (summary.status === "ready") {
    return (
      <SummaryView
        sessionId={sessionId}
        view={summary.view}
        onChange={onChange}
      />
    );
  }

  if (summary.status === "loading") {
    return (
      <p className="text-sm text-muted-foreground">
        Menyusun ringkasan dari percakapanmu. Biasanya kurang dari satu menit.
      </p>
    );
  }

  if (summary.status === "not_configured") {
    return <AiInvite simulation />;
  }

  if (summary.status === "error") {
    return (
      <div className="flex flex-col items-start gap-3 text-sm">
        <p role="alert">
          {summary.message} Percakapanmu sudah tersimpan, jadi ringkasannya bisa
          diminta lagi kapan saja.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={onRequest}>
          Coba lagi
        </Button>
      </div>
    );
  }

  // Ended before anything was answered: there is nothing to summarize.
  if (summary.status === "empty" || status === "abandoned") {
    return (
      <div className="flex flex-col items-start gap-3 text-sm">
        <p className="text-muted-foreground">
          Sesi ini berakhir sebelum ada jawaban, jadi tidak ada ringkasannya.
          Tidak apa-apa: mulai lagi saat kamu siap.
        </p>
        {again}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-3 text-sm">
      <p className="text-muted-foreground">
        Sesi ini sudah selesai, tapi ringkasannya belum disusun.
      </p>
      <Button type="button" variant="outline" size="sm" onClick={onRequest}>
        Minta ringkasan
      </Button>
    </div>
  );
}
