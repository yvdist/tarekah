"use client";

import { BookOpen, MessagesSquare, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { DeleteButton } from "@/components/delete-button";
import { OptionSelect } from "@/components/option-select";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import type {
  QuestionCategory,
  QuestionReadiness,
} from "@/db/schema/enum-values";
import { formatDateTime } from "@/features/applications/format";
import { INTERVIEW_STAGE_LABELS } from "@/features/interviews/labels";
import {
  deleteQuestion,
  setQuestionCategory,
  setQuestionReadiness,
} from "../actions";
import {
  QUESTION_CATEGORY_OPTIONS,
  QUESTION_READINESS_OPTIONS,
  QUESTION_SOURCE_LABELS,
} from "../labels";
import type { QuestionListItem } from "../queries";
import {
  QuestionFormDialog,
  type QuestionFormOptions,
} from "./question-form-dialog";
import {
  QuestionStoriesDialog,
  type StoryOption,
} from "./question-stories-dialog";

export type QuestionRowOptions = QuestionFormOptions & {
  stories: ReadonlyArray<StoryOption>;
};

export function AddQuestionButton({
  options,
}: {
  options: QuestionFormOptions;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus />
        Tambah pertanyaan
      </Button>
      <QuestionFormDialog
        open={open}
        onOpenChange={setOpen}
        options={options}
      />
    </>
  );
}

export function QuestionRow({
  question,
  options,
}: {
  question: QuestionListItem;
  options: QuestionRowOptions;
}) {
  const id = useId();
  const [editOpen, setEditOpen] = useState(false);
  const [storiesOpen, setStoriesOpen] = useState(false);
  const shortText =
    question.text.length > 60
      ? `${question.text.slice(0, 57)}…`
      : question.text;

  return (
    <li className="flex flex-col gap-3 px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="min-w-0 flex-1 text-sm">{question.text}</p>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Edit pertanyaan: ${shortText}`}
            onClick={() => setEditOpen(true)}
          >
            <Pencil />
          </Button>
          <DeleteButton
            action={deleteQuestion.bind(null, question.id)}
            label={`Hapus pertanyaan: ${shortText}`}
            title="Hapus pertanyaan ini?"
            description="Pertanyaan dan catatannya dihapus permanen. Cerita yang tertaut tidak ikut terhapus."
            successMessage="Pertanyaan dihapus"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <Badge variant="secondary">
          {QUESTION_SOURCE_LABELS[question.source]}
        </Badge>
        {question.stage ? (
          <Badge variant="outline">
            {INTERVIEW_STAGE_LABELS[question.stage]}
          </Badge>
        ) : null}
        {question.applicationId && question.companyName ? (
          <Link
            href={`/applications/${question.applicationId}`}
            className="underline-offset-4 hover:underline"
          >
            {question.companyName} · {question.position}
          </Link>
        ) : null}
        {question.scheduledAt ? (
          <span className="font-figure">
            {formatDateTime(question.scheduledAt)}
          </span>
        ) : null}
      </div>

      {question.notes ? (
        <p className="text-sm whitespace-pre-wrap text-muted-foreground">
          {question.notes}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <InlineSelect
          id={`${id}-category`}
          label="Kategori"
          value={question.category}
          options={QUESTION_CATEGORY_OPTIONS}
          action={(value) => setQuestionCategory(question.id, value)}
        />
        <InlineSelect
          id={`${id}-readiness`}
          label="Kesiapan"
          value={question.readiness}
          options={QUESTION_READINESS_OPTIONS}
          action={(value) => setQuestionReadiness(question.id, value)}
        />
        <Button
          variant="outline"
          size="sm"
          aria-label={`Cerita untuk pertanyaan: ${shortText}`}
          onClick={() => setStoriesOpen(true)}
        >
          <BookOpen />
          {question.stories.length > 0
            ? `${question.stories.length} cerita`
            : "Tautkan cerita"}
        </Button>
        <Link
          href={`/practice/drill/${question.id}`}
          aria-label={`Latih pertanyaan ini: ${shortText}`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <MessagesSquare />
          Latih
        </Link>
        {question.stories.map((story) => (
          <Link
            key={story.id}
            href={`/stories/${story.id}`}
            className="rounded-full border px-2.5 py-0.5 text-xs underline-offset-4 hover:underline"
          >
            {story.title}
          </Link>
        ))}
      </div>

      <QuestionFormDialog
        questionId={question.id}
        defaultValues={{
          text: question.text,
          category: question.category,
          applicationId: question.applicationId ?? "",
          notes: question.notes ?? "",
        }}
        options={options}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <QuestionStoriesDialog
        questionId={question.id}
        questionText={question.text}
        linkedIds={question.stories.map((story) => story.id)}
        options={options.stories}
        open={storiesOpen}
        onOpenChange={setStoriesOpen}
      />
    </li>
  );
}

// A select that saves on change. The server re-renders the row, so the value
// shown is always what was saved; a failure just reports and leaves it.
function InlineSelect<T extends QuestionCategory | QuestionReadiness>({
  id,
  label,
  value,
  options,
  action,
}: {
  id: string;
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  action: (value: T) => Promise<{ ok: boolean; message?: string }>;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <label htmlFor={id}>{label}</label>
      <OptionSelect
        id={id}
        value={value}
        options={options}
        disabled={pending}
        onValueChange={(next) =>
          startTransition(async () => {
            try {
              const result = await action(next);

              if (!result.ok) {
                toast.error(result.message ?? "Perubahan gagal disimpan.");
              }
            } catch {
              toast.error("Perubahan gagal disimpan. Coba lagi.");
            }
          })
        }
      />
    </div>
  );
}
