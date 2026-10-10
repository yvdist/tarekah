"use client";

import { BookOpen, Check, PenLine } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StoryForm } from "@/features/stories/components/story-form";
import { useOpenKey } from "@/hooks/use-open-key";
import { applyStorySuggestion, saveSessionQuestions } from "../actions";
import type { SummaryView as Summary } from "../data";
import { FEEDBACK_ASPECT_LABELS } from "../labels";

const HEADING_CLASS = "text-xs text-muted-foreground";

// The notes after a simulation: what went well, what to work on next, a word
// on each answer, the questions worth keeping and the stories that would have
// helped. Notes only, never a score.
export function SummaryView({
  sessionId,
  view,
  onChange,
}: {
  sessionId: string;
  view: Summary;
  // The bank changed: the same summary, with what is saved and linked now.
  onChange: (view: Summary) => void;
}) {
  return (
    <div className="flex flex-col gap-6 text-sm">
      {view.overallStrengths.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h3 className={HEADING_CLASS}>Yang sudah kuat</h3>
          <ul className="flex list-disc flex-col gap-1.5 pl-5">
            {view.overallStrengths.map((strength) => (
              <li key={strength}>{strength}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {view.focusAreas.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h3 className={HEADING_CLASS}>Fokus berikutnya</h3>
          <ul className="flex flex-col gap-2.5">
            {view.focusAreas.map((area) => (
              <li
                key={`${area.aspect}-${area.note}`}
                className="flex flex-col gap-0.5"
              >
                <span className="font-medium">
                  {FEEDBACK_ASPECT_LABELS[area.aspect]}
                </span>
                <span>{area.note}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {view.perQuestion.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h3 className={HEADING_CLASS}>Per pertanyaan</h3>
          <ol className="flex flex-col gap-4">
            {view.perQuestion.map((item, index) => (
              <li
                key={`${index}-${item.question}`}
                className="flex flex-col gap-1.5"
              >
                <span className="font-medium break-words">{item.question}</span>
                <span>{item.note}</span>
                {item.improvedAnswerHint ? (
                  <span className="rounded-md bg-muted px-4 py-3 break-words">
                    {item.improvedAnswerHint}
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {view.questions.length > 0 ? (
        <QuestionChecklist
          // Starts over from what the bank holds now.
          key={view.questions.map(({ inBank }) => inBank).join()}
          sessionId={sessionId}
          questions={view.questions}
          onChange={onChange}
        />
      ) : null}

      {view.suggestions.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h3 className={HEADING_CLASS}>Saran cerita</h3>
          <ul className="flex flex-col gap-4">
            {view.suggestions.map((suggestion, index) => (
              <li key={`${index}-${suggestion.question}`}>
                <Suggestion
                  sessionId={sessionId}
                  index={index}
                  suggestion={suggestion}
                  onChange={onChange}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="border-t pt-3 text-xs text-muted-foreground">
        Anggap ini sebagai catatan, bukan penilaian.
      </p>
    </div>
  );
}

// The questions of the session, ticked to go into the bank. One the bank
// already has is shown as kept and cannot be ticked.
function QuestionChecklist({
  sessionId,
  questions,
  onChange,
}: {
  sessionId: string;
  questions: Summary["questions"];
  onChange: (view: Summary) => void;
}) {
  const id = useId();
  const [pending, startTransition] = useTransition();
  const [chosen, setChosen] = useState(() =>
    questions.flatMap(({ inBank }, index) => (inBank ? [] : [index])),
  );
  const open = questions.some(({ inBank }) => !inBank);

  function save() {
    startTransition(async () => {
      try {
        const result = await saveSessionQuestions(sessionId, chosen);

        if (!result.ok) {
          toast.error(result.message);
          return;
        }

        const { created, skipped, view } = result.data;

        toast.success(
          created > 0
            ? `${created} pertanyaan disimpan ke bank`
            : "Pertanyaan itu sudah ada di bank pertanyaanmu",
          skipped > 0 && created > 0
            ? { description: `${skipped} sudah ada, jadi dilewati.` }
            : undefined,
        );
        onChange(view);
      } catch {
        toast.error("Pertanyaan gagal disimpan. Coba lagi.");
      }
    });
  }

  return (
    <section className="flex flex-col gap-2">
      <h3 id={`${id}-label`} className={HEADING_CLASS}>
        Simpan pertanyaan ke bank
      </h3>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
        className="flex flex-col gap-3"
      >
        <div
          role="group"
          aria-labelledby={`${id}-label`}
          className="flex flex-col gap-2.5"
        >
          {questions.map((question, index) => (
            <label
              key={`${index}-${question.text}`}
              className="flex items-start gap-2.5"
            >
              <Checkbox
                className="mt-0.5"
                disabled={question.inBank || pending}
                checked={question.inBank || chosen.includes(index)}
                onCheckedChange={(checked) =>
                  setChosen((current) =>
                    checked
                      ? [...current, index]
                      : current.filter((item) => item !== index),
                  )
                }
              />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="break-words">{question.text}</span>
                {question.inBank ? (
                  <span className="text-xs text-muted-foreground">
                    Sudah ada di bank
                  </span>
                ) : null}
              </span>
            </label>
          ))}
        </div>
        {open ? (
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="self-start"
            disabled={pending || chosen.length === 0}
          >
            {pending ? "Menyimpan…" : "Simpan ke bank"}
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">
            Semua pertanyaan sesi ini sudah ada di bank pertanyaanmu.
          </p>
        )}
      </form>
    </section>
  );
}

// One suggestion: a story of the user's that fits a question, linked with one
// click, or an experience worth writing down, which opens the story form.
function Suggestion({
  sessionId,
  index,
  suggestion,
  onChange,
}: {
  sessionId: string;
  index: number;
  suggestion: Summary["suggestions"][number];
  onChange: (view: Summary) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [writeOpen, setWriteOpen] = useState(false);
  const writeKey = useOpenKey(writeOpen);
  const { story } = suggestion;

  function apply(storyId?: string) {
    startTransition(async () => {
      try {
        const result = await applyStorySuggestion(sessionId, index, storyId);

        if (!result.ok) {
          toast.error(result.message);
          return;
        }

        toast.success("Cerita ditautkan ke pertanyaan ini");
        onChange(result.data.view);
      } catch {
        toast.error("Cerita gagal ditautkan. Coba lagi.");
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <span className="font-medium break-words">{suggestion.question}</span>
      <span>{suggestion.suggestion}</span>
      {suggestion.linked && story ? (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Check className="size-3.5" aria-hidden />
          Tertaut ke cerita {story.title}
        </span>
      ) : story ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => apply()}
        >
          <BookOpen />
          {pending ? "Menautkan…" : `Tautkan cerita ${story.title}`}
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => setWriteOpen(true)}
        >
          <PenLine />
          Tulis cerita baru
        </Button>
      )}

      <Dialog open={writeOpen} onOpenChange={setWriteOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Tulis cerita baru</DialogTitle>
            <DialogDescription>
              Yang wajib hanya judul. Cerita ini langsung ditautkan ke
              pertanyaan tadi.
            </DialogDescription>
          </DialogHeader>
          <StoryForm
            key={writeKey}
            bare
            onSaved={(saved) => {
              setWriteOpen(false);
              apply(saved.id);
            }}
            onCancel={() => setWriteOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
