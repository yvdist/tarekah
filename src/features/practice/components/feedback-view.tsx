"use client";

import { Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { AI_PROVIDER_LABELS } from "@/features/ai/providers";
import { saveFollowUpQuestion } from "../actions";
import { FEEDBACK_ASPECT_LABELS } from "../labels";
import type { StoredFeedback } from "../schemas";

const HEADING_CLASS = "text-xs text-muted-foreground";

// Feedback on one answer: what works, what to sharpen, a tidier version and
// the question that may come next. Notes only, never a score.
export function FeedbackView({
  sessionId,
  feedback,
}: {
  sessionId: string;
  feedback: StoredFeedback;
}) {
  const { strengths, improvements, improvedAnswer, followUpQuestion } =
    feedback.result;

  return (
    <div className="flex flex-col gap-5 text-sm">
      {strengths.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h3 className={HEADING_CLASS}>Yang sudah kuat</h3>
          <ul className="flex list-disc flex-col gap-1.5 pl-5">
            {strengths.map((strength) => (
              <li key={strength}>{strength}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {improvements.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h3 className={HEADING_CLASS}>Yang bisa dipertajam</h3>
          <ul className="flex flex-col gap-2.5">
            {improvements.map((improvement) => (
              <li
                key={`${improvement.aspect}-${improvement.note}`}
                className="flex flex-col gap-0.5"
              >
                <span className="font-medium">
                  {FEEDBACK_ASPECT_LABELS[improvement.aspect]}
                </span>
                <span>{improvement.note}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {improvedAnswer ? (
        <section className="flex flex-col gap-2">
          <h3 className={HEADING_CLASS}>Versi lebih rapi</h3>
          <p className="rounded-md bg-muted px-4 py-3 break-words whitespace-pre-wrap">
            {improvedAnswer}
          </p>
        </section>
      ) : null}

      {followUpQuestion ? (
        <FollowUp sessionId={sessionId} question={followUpQuestion} />
      ) : null}

      <p className="border-t pt-3 text-xs text-muted-foreground">
        Masukan dari {AI_PROVIDER_LABELS[feedback.provider]} ·{" "}
        <span className="font-mono break-all">{feedback.model}</span>. Anggap
        sebagai catatan, bukan penilaian.
      </p>
    </div>
  );
}

function FollowUp({
  sessionId,
  question,
}: {
  sessionId: string;
  question: string;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(
    null,
  );

  function save() {
    startTransition(async () => {
      try {
        const outcome = await saveFollowUpQuestion(sessionId);

        setResult(
          outcome.ok
            ? { ok: true, message: "Tersimpan di bank pertanyaan." }
            : { ok: false, message: outcome.message },
        );
      } catch {
        setResult({
          ok: false,
          message: "Pertanyaan gagal disimpan. Coba lagi.",
        });
      }
    });
  }

  return (
    <section className="flex flex-col gap-2">
      <h3 className={HEADING_CLASS}>Pertanyaan lanjutan yang mungkin muncul</h3>
      <p className="break-words">{question}</p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {result?.ok ? null : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={save}
          >
            <Plus />
            {pending ? "Menyimpan…" : "Simpan ke bank"}
          </Button>
        )}
        <p
          role="status"
          className={
            result?.ok === false
              ? "text-xs text-destructive"
              : "text-xs text-muted-foreground"
          }
        >
          {result?.message}
        </p>
      </div>
    </section>
  );
}
