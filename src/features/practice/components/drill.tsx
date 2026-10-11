"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { BookOpen, PenLine, RotateCcw } from "lucide-react";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { OptionSelect } from "@/components/option-select";
import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  setQuestionReadiness,
  setQuestionStories,
} from "@/features/questions/actions";
import {
  QuestionStoriesDialog,
  type StoryOption,
} from "@/features/questions/components/question-stories-dialog";
import { QUESTION_READINESS_OPTIONS } from "@/features/questions/labels";
import { StoryForm } from "@/features/stories/components/story-form";
import type { TranscriptionProvider } from "@/features/ai/transcription";
import { useOpenKey } from "@/hooks/use-open-key";
import { describedBy } from "@/lib/form-errors";
import {
  type DrillFeedbackOutcome,
  requestDrillFeedback,
  saveDrillAnswer,
} from "../actions";
import type { PracticeQuestion } from "../data";
import { PRACTICE_LANGUAGE_OPTIONS } from "../labels";
import { detectLanguage } from "../language";
import {
  ANSWER_MAX_LENGTH,
  type DrillAnswerInput,
  drillAnswerSchema,
} from "../schemas";
import { AiInvite } from "./ai-invite";
import { AnswerTimer } from "./answer-timer";
import { FeedbackView } from "./feedback-view";
import {
  type PickableQuestion,
  RandomQuestionButton,
} from "./random-question-button";
import { SpokenDuration } from "./spoken-duration";
import { useVoicePath, VoiceInput } from "./voice-input";

type FeedbackState =
  | DrillFeedbackOutcome
  | { status: "loading" }
  | { status: "error"; message: string };

// A saved answer and where its feedback stands. `spokenSeconds` is how long
// the microphone was on for it: zero for an answer that was typed.
type Attempt = {
  sessionId: string;
  answer: string;
  spokenSeconds: number;
  feedback: FeedbackState;
};

// One question, one answer. The answer is saved first and feedback asked for
// second, so an answer is never lost to a provider that fails, and a user
// without a key still has their practice on record.
export function Drill({
  question,
  aiReady,
  transcriptionProvider,
  storyOptions,
  questions,
}: {
  question: PracticeQuestion;
  // Whether a key is active. Without one the answer is saved and nothing is
  // asked of a provider.
  aiReady: boolean;
  // Whose key turns a recording into text where the browser cannot listen.
  transcriptionProvider: TranscriptionProvider | null;
  storyOptions: ReadonlyArray<StoryOption>;
  // The other questions of the user, to pick the next one from.
  questions: ReadonlyArray<PickableQuestion>;
}) {
  const id = useId();
  const [pending, startTransition] = useTransition();
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [listening, setListening] = useState(false);
  // How long the microphone has been on for the answer being written.
  const [spokenSeconds, setSpokenSeconds] = useState(0);
  const voicePath = useVoicePath(transcriptionProvider);
  const canSpeak = voicePath === "speech" || voicePath === "record";
  const savedNote = useRef<HTMLParagraphElement>(null);
  const form = useForm<DrillAnswerInput>({
    resolver: zodResolver(drillAnswerSchema),
    defaultValues: {
      questionId: question.id,
      answer: "",
      language: detectLanguage(question.text),
    },
  });
  const { errors } = form.formState;
  const length = useWatch({ control: form.control, name: "answer" }).length;
  const language = useWatch({ control: form.control, name: "language" });
  const sessionId = attempt?.sessionId;

  // The form is gone once the answer is saved, and focus with it.
  useEffect(() => {
    if (sessionId) {
      savedNote.current?.focus();
    }
  }, [sessionId]);

  async function loadFeedback(session: string) {
    let feedback: FeedbackState;

    try {
      const result = await requestDrillFeedback(session);

      feedback = result.ok
        ? result.data
        : { status: "error", message: result.message };
    } catch {
      feedback = {
        status: "error",
        message: "Masukan gagal diminta. Coba lagi.",
      };
    }

    setAttempt((current) =>
      current?.sessionId === session ? { ...current, feedback } : current,
    );
  }

  // The server parses the same raw values again with the same schema.
  function submit() {
    const input = form.getValues();

    startTransition(async () => {
      try {
        const saved = await saveDrillAnswer(input);

        if (!saved.ok) {
          const message = saved.fieldErrors?.answer?.[0];

          if (message) {
            form.setError("answer", { message });
          }

          toast.error(saved.message);
          return;
        }

        setAttempt({
          sessionId: saved.data.sessionId,
          answer: input.answer.trim(),
          spokenSeconds,
          feedback: aiReady
            ? { status: "loading" }
            : { status: "not_configured" },
        });

        if (aiReady) {
          await loadFeedback(saved.data.sessionId);
        }
      } catch {
        toast.error("Jawaban gagal disimpan. Coba lagi.");
      }
    });
  }

  // The answer is already saved: only the feedback is asked for again.
  function retryFeedback(session: string) {
    setAttempt((current) =>
      current?.sessionId === session
        ? { ...current, feedback: { status: "loading" } }
        : current,
    );
    startTransition(() => loadFeedback(session));
  }

  function answerAgain() {
    setSpokenSeconds(0);
    setAttempt(null);
    setAttemptCount((count) => count + 1);
  }

  return (
    <div className="flex flex-col gap-4">
      <Panel
        title="Jawabanmu"
        action={<AnswerTimer key={attemptCount} paused={attempt !== null} />}
      >
        {attempt ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm break-words whitespace-pre-wrap">
              {attempt.answer}
            </p>
            <p
              ref={savedNote}
              tabIndex={-1}
              className="text-xs text-muted-foreground outline-none"
            >
              Jawaban tersimpan.
            </p>
            {attempt.spokenSeconds > 0 ? (
              <SpokenDuration seconds={attempt.spokenSeconds} />
            ) : null}
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(submit)} noValidate>
            <FieldGroup>
              <Field data-invalid={!!errors.answer}>
                <FieldLabel htmlFor={`${id}-answer`} className="sr-only">
                  Jawaban
                </FieldLabel>
                <Textarea
                  id={`${id}-answer`}
                  aria-describedby={describedBy(
                    `${id}-answer-description`,
                    !!errors.answer && `${id}-answer-error`,
                  )}
                  aria-required
                  rows={10}
                  className="min-h-48"
                  placeholder="Tulis seperti kamu mengucapkannya di interview."
                  aria-invalid={!!errors.answer}
                  // What is heard rewrites the field as it is worked out.
                  readOnly={listening}
                  {...form.register("answer")}
                />
                <FieldDescription
                  id={`${id}-answer-description`}
                  className="flex justify-between gap-4"
                >
                  <span>Tidak perlu sempurna. Yang penting keluar dulu.</span>
                  <span className="font-figure">
                    {length}/{ANSWER_MAX_LENGTH}
                  </span>
                </FieldDescription>
                <FieldError
                  id={`${id}-answer-error`}
                  errors={[errors.answer]}
                />
              </Field>

              <VoiceInput
                transcriptionProvider={transcriptionProvider}
                language={language}
                disabled={pending}
                read={() => form.getValues("answer")}
                write={(text) =>
                  form.setValue("answer", text, {
                    shouldDirty: true,
                    shouldValidate: form.formState.isSubmitted,
                  })
                }
                onListening={setListening}
                onSpoken={(seconds) =>
                  setSpokenSeconds((total) => total + seconds)
                }
              />

              <div className="flex flex-wrap items-center gap-3 border-t pt-5">
                {/* The language feedback is written in, and the one the
                    microphone listens for. */}
                {aiReady || canSpeak ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <label htmlFor={`${id}-language`}>Bahasa jawaban</label>
                    <Controller
                      control={form.control}
                      name="language"
                      render={({ field }) => (
                        <OptionSelect
                          id={`${id}-language`}
                          value={field.value}
                          onValueChange={field.onChange}
                          options={PRACTICE_LANGUAGE_OPTIONS}
                          disabled={listening}
                        />
                      )}
                    />
                  </div>
                ) : null}
                <Button
                  type="submit"
                  disabled={pending || listening}
                  className="ml-auto"
                >
                  {pending
                    ? "Menyimpan…"
                    : aiReady
                      ? "Simpan dan minta masukan"
                      : "Simpan jawaban"}
                </Button>
              </div>
            </FieldGroup>
          </form>
        )}
      </Panel>

      {attempt ? (
        <>
          <Panel title="Masukan">
            <div
              aria-live="polite"
              aria-busy={attempt.feedback.status === "loading"}
            >
              <FeedbackArea
                attempt={attempt}
                pending={pending}
                onRetry={() => retryFeedback(attempt.sessionId)}
              />
            </div>
          </Panel>
          <AfterAnswer
            question={question}
            storyOptions={storyOptions}
            questions={questions}
            onAnswerAgain={answerAgain}
          />
        </>
      ) : null}
    </div>
  );
}

function FeedbackArea({
  attempt,
  pending,
  onRetry,
}: {
  attempt: Attempt;
  pending: boolean;
  onRetry: () => void;
}) {
  const { feedback } = attempt;

  if (feedback.status === "loading") {
    return (
      <p className="text-sm text-muted-foreground">
        Membaca jawabanmu. Biasanya kurang dari setengah menit.
      </p>
    );
  }

  if (feedback.status === "not_configured") {
    return <AiInvite />;
  }

  if (feedback.status === "error") {
    return (
      <div className="flex flex-col items-start gap-3 text-sm">
        <p>
          {feedback.message} Jawabanmu sudah tersimpan, jadi tidak perlu menulis
          ulang.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={onRetry}
        >
          Coba lagi
        </Button>
      </div>
    );
  }

  return (
    <FeedbackView sessionId={attempt.sessionId} feedback={feedback.feedback} />
  );
}

// What can follow an answer: a new self-assessment, a story to lean on next
// time, another try, or the next question.
function AfterAnswer({
  question,
  storyOptions,
  questions,
  onAnswerAgain,
}: {
  question: PracticeQuestion;
  storyOptions: ReadonlyArray<StoryOption>;
  questions: ReadonlyArray<PickableQuestion>;
  onAnswerAgain: () => void;
}) {
  const id = useId();
  const [pending, startTransition] = useTransition();
  const [linkOpen, setLinkOpen] = useState(false);
  const [writeOpen, setWriteOpen] = useState(false);
  const writeKey = useOpenKey(writeOpen);
  const linkedIds = question.stories.map((story) => story.id);

  function run(action: () => Promise<{ ok: boolean; message?: string }>) {
    startTransition(async () => {
      try {
        const result = await action();

        if (!result.ok) {
          toast.error(result.message ?? "Perubahan gagal disimpan.");
        }
      } catch {
        toast.error("Perubahan gagal disimpan. Coba lagi.");
      }
    });
  }

  // The new story is saved by then; this links it to the question.
  function linkNewStory(story: { id: string }) {
    setWriteOpen(false);
    run(() => setQuestionStories(question.id, [...linkedIds, story.id]));
  }

  return (
    <Panel title="Setelah ini">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <label htmlFor={`${id}-readiness`}>Kesiapan</label>
          <OptionSelect
            id={`${id}-readiness`}
            value={question.readiness}
            options={QUESTION_READINESS_OPTIONS}
            disabled={pending}
            onValueChange={(readiness) =>
              run(() => setQuestionReadiness(question.id, readiness))
            }
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setLinkOpen(true)}
        >
          <BookOpen />
          {linkedIds.length > 0
            ? `${linkedIds.length} cerita tertaut`
            : "Tautkan cerita"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setWriteOpen(true)}
        >
          <PenLine />
          Tulis cerita baru
        </Button>
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t pt-5">
        <Button type="button" variant="outline" onClick={onAnswerAgain}>
          <RotateCcw />
          Coba jawab lagi
        </Button>
        <RandomQuestionButton items={questions}>
          Pertanyaan berikutnya
        </RandomQuestionButton>
      </div>

      <QuestionStoriesDialog
        questionId={question.id}
        questionText={question.text}
        linkedIds={linkedIds}
        options={storyOptions}
        open={linkOpen}
        onOpenChange={setLinkOpen}
      />
      <Dialog open={writeOpen} onOpenChange={setWriteOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Tulis cerita baru</DialogTitle>
            <DialogDescription>
              Yang wajib hanya judul. Cerita ini langsung ditautkan ke
              pertanyaan yang sedang kamu latih.
            </DialogDescription>
          </DialogHeader>
          <StoryForm
            key={writeKey}
            bare
            onSaved={linkNewStory}
            onCancel={() => setWriteOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Panel>
  );
}
