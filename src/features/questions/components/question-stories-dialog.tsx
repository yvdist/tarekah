"use client";

import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useOpenKey } from "@/hooks/use-open-key";
import { setQuestionStories } from "../actions";

export type StoryOption = { id: string; title: string };

export function QuestionStoriesDialog({
  questionId,
  questionText,
  linkedIds,
  options,
  open,
  onOpenChange,
}: {
  questionId: string;
  questionText: string;
  linkedIds: string[];
  options: ReadonlyArray<StoryOption>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const formKey = useOpenKey(open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cerita untuk pertanyaan ini</DialogTitle>
          <DialogDescription className="line-clamp-2">
            {questionText}
          </DialogDescription>
        </DialogHeader>
        <StoryPicker
          key={formKey}
          questionId={questionId}
          linkedIds={linkedIds}
          options={options}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function StoryPicker({
  questionId,
  linkedIds,
  options,
  onDone,
}: {
  questionId: string;
  linkedIds: string[];
  options: ReadonlyArray<StoryOption>;
  onDone: () => void;
}) {
  const id = useId();
  const [selected, setSelected] = useState(linkedIds);
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      try {
        const result = await setQuestionStories(questionId, selected);

        if (!result.ok) {
          toast.error(result.message);
          return;
        }

        toast.success("Tautan cerita disimpan");
        onDone();
      } catch {
        toast.error("Tautan cerita gagal disimpan. Coba lagi.");
      }
    });
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="flex flex-col gap-4"
    >
      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Belum ada cerita. Tulis pengalamanmu dalam format STAR dulu, lalu
          tautkan ke pertanyaan ini.
        </p>
      ) : (
        <div
          role="group"
          aria-labelledby={`${id}-label`}
          className="flex max-h-72 flex-col gap-2 overflow-y-auto rounded-lg border p-3"
        >
          <span id={`${id}-label`} className="sr-only">
            Pilih cerita
          </span>
          {options.map((story) => (
            <label key={story.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={selected.includes(story.id)}
                onCheckedChange={(checked) =>
                  setSelected((current) =>
                    checked
                      ? [...current, story.id]
                      : current.filter((value) => value !== story.id),
                  )
                }
              />
              {story.title}
            </label>
          ))}
        </div>
      )}
      <div className="flex justify-end gap-2 border-t pt-4">
        {options.length === 0 ? (
          <Link
            href="/stories/new"
            className={buttonVariants({ variant: "outline" })}
          >
            Tulis cerita
          </Link>
        ) : (
          <Button type="button" variant="outline" onClick={onDone}>
            Batal
          </Button>
        )}
        <Button type="submit" disabled={pending || options.length === 0}>
          {pending ? "Menyimpan…" : "Simpan"}
        </Button>
      </div>
    </form>
  );
}
