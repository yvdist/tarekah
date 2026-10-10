"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X } from "lucide-react";
import { useId, useTransition, type ClipboardEvent } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { OptionSelect } from "@/components/option-select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useOpenKey } from "@/hooks/use-open-key";
import { describedBy, setFieldErrors } from "@/lib/form-errors";
import { createInterview, updateInterview } from "../actions";
import { INTERVIEW_STAGE_OPTIONS } from "../labels";
import { splitQuestions } from "../questions";
import {
  interviewFormSchema,
  type InterviewFormInput,
  type InterviewFormValues,
} from "../schemas";

const EMPTY_QUESTION = { id: "", text: "" };

export const EMPTY_VALUES: InterviewFormInput = {
  scheduledAt: "",
  stage: "hr",
  interviewers: "",
  questions: [EMPTY_QUESTION],
  reflection: "",
};

const FIELD_NAMES = [
  "scheduledAt",
  "stage",
  "interviewers",
  "questions",
  "reflection",
] as const;

export function InterviewFormDialog({
  applicationId,
  interviewId,
  defaultValues = EMPTY_VALUES,
  open,
  onOpenChange,
}: {
  applicationId: string;
  // Present when editing; absent when creating.
  interviewId?: string;
  defaultValues?: InterviewFormInput;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const formKey = useOpenKey(open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {interviewId ? "Edit interview" : "Tambah interview"}
          </DialogTitle>
        </DialogHeader>
        <InterviewForm
          key={formKey}
          applicationId={applicationId}
          interviewId={interviewId}
          defaultValues={defaultValues}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function InterviewForm({
  applicationId,
  interviewId,
  defaultValues,
  onDone,
}: {
  applicationId: string;
  interviewId?: string;
  defaultValues: InterviewFormInput;
  onDone: () => void;
}) {
  const id = useId();
  const [pending, startTransition] = useTransition();
  const form = useForm<InterviewFormInput, unknown, InterviewFormValues>({
    resolver: zodResolver(interviewFormSchema),
    defaultValues,
  });
  const { errors } = form.formState;
  // keyName: the rows carry their own `id` (the question's), which the
  // default key name would overwrite.
  const questionRows = useFieldArray({
    control: form.control,
    name: "questions",
    keyName: "key",
  });

  // Pasting several lines into one row spreads them over new rows, so a
  // list copied from notes still lands as separate questions.
  function pasteQuestions(index: number, event: ClipboardEvent) {
    const lines = splitQuestions(event.clipboardData.getData("text"));

    if (lines.length < 2) {
      return;
    }

    event.preventDefault();

    const [head, ...rest] = lines;
    const current = form.getValues(`questions.${index}.text`).trim();

    form.setValue(
      `questions.${index}.text`,
      current ? `${current} ${head}` : head,
    );
    questionRows.insert(
      index + 1,
      rest.map((text) => ({ id: "", text })),
    );
  }

  // The server parses the same raw strings again with the same schema, so the
  // untransformed form values are what gets sent.
  function submit() {
    const input = form.getValues();

    startTransition(async () => {
      try {
        const result = interviewId
          ? await updateInterview(interviewId, input)
          : await createInterview(applicationId, input);

        if (!result.ok) {
          setFieldErrors(form.setError, result.fieldErrors, FIELD_NAMES);
          toast.error(result.message);
          return;
        }

        toast.success(
          interviewId ? "Perubahan disimpan" : "Interview ditambahkan",
        );
        onDone();
      } catch {
        toast.error("Interview gagal disimpan. Coba lagi.");
      }
    });
  }

  const questionsError = errors.questions?.root ?? errors.questions;

  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate>
      <FieldGroup>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={!!errors.scheduledAt}>
            <FieldLabel htmlFor={`${id}-scheduledAt`}>
              Tanggal dan jam (WIB)
            </FieldLabel>
            <Input
              id={`${id}-scheduledAt`}
              aria-describedby={describedBy(
                !!errors.scheduledAt && `${id}-scheduledAt-error`,
              )}
              aria-required
              type="datetime-local"
              aria-invalid={!!errors.scheduledAt}
              {...form.register("scheduledAt")}
            />
            <FieldError
              id={`${id}-scheduledAt-error`}
              errors={[errors.scheduledAt]}
            />
          </Field>

          <Field data-invalid={!!errors.stage}>
            <FieldLabel htmlFor={`${id}-stage`}>Tahap</FieldLabel>
            <Controller
              control={form.control}
              name="stage"
              render={({ field }) => (
                <OptionSelect
                  id={`${id}-stage`}
                  aria-describedby={describedBy(
                    !!errors.stage && `${id}-stage-error`,
                  )}
                  value={field.value}
                  onValueChange={field.onChange}
                  options={INTERVIEW_STAGE_OPTIONS}
                  invalid={!!errors.stage}
                  className="w-full"
                />
              )}
            />
            <FieldError id={`${id}-stage-error`} errors={[errors.stage]} />
          </Field>
        </div>

        <Field data-invalid={!!errors.interviewers}>
          <FieldLabel htmlFor={`${id}-interviewers`}>Interviewer</FieldLabel>
          <Input
            id={`${id}-interviewers`}
            aria-describedby={describedBy(
              !!errors.interviewers && `${id}-interviewers-error`,
            )}
            placeholder="Nama dan jabatan"
            aria-invalid={!!errors.interviewers}
            {...form.register("interviewers")}
          />
          <FieldError
            id={`${id}-interviewers-error`}
            errors={[errors.interviewers]}
          />
        </Field>

        <Field data-invalid={!!questionsError}>
          <FieldLabel id={`${id}-questions`}>
            Pertanyaan yang ditanyakan
          </FieldLabel>
          <div
            role="group"
            aria-labelledby={`${id}-questions`}
            aria-describedby={`${id}-questions-description`}
            className="flex flex-col gap-2"
          >
            {questionRows.fields.map((row, index) => {
              const rowError = errors.questions?.[index]?.text;

              return (
                <div key={row.key} className="flex flex-col gap-1">
                  <div className="flex items-start gap-2">
                    <Input
                      aria-label={`Pertanyaan ${index + 1}`}
                      aria-invalid={!!rowError}
                      aria-describedby={describedBy(
                        !!rowError && `${id}-questions-${index}-error`,
                      )}
                      onPaste={(event) => pasteQuestions(index, event)}
                      {...form.register(`questions.${index}.text`)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Hapus pertanyaan ${index + 1}`}
                      onClick={() =>
                        questionRows.fields.length > 1
                          ? questionRows.remove(index)
                          : form.setValue(`questions.${index}.text`, "")
                      }
                    >
                      <X />
                    </Button>
                  </div>
                  <FieldError
                    id={`${id}-questions-${index}-error`}
                    errors={[rowError]}
                  />
                </div>
              );
            })}
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => questionRows.append({ ...EMPTY_QUESTION })}
              >
                <Plus />
                Tambah pertanyaan
              </Button>
            </div>
          </div>
          <FieldDescription id={`${id}-questions-description`}>
            Satu kotak satu pertanyaan. Tempel beberapa baris sekaligus dan tiap
            baris jadi pertanyaan sendiri. Semuanya terkumpul di halaman
            Pertanyaan, tempat kamu menandai kesiapan dan menautkan cerita.
          </FieldDescription>
          <FieldError errors={[questionsError]} />
        </Field>

        <Field data-invalid={!!errors.reflection}>
          <FieldLabel htmlFor={`${id}-reflection`}>Refleksi</FieldLabel>
          <Textarea
            id={`${id}-reflection`}
            aria-describedby={describedBy(
              `${id}-reflection-description`,
              !!errors.reflection && `${id}-reflection-error`,
            )}
            rows={5}
            placeholder="Apa yang berjalan baik, apa yang perlu diperbaiki"
            aria-invalid={!!errors.reflection}
            {...form.register("reflection")}
          />
          <FieldDescription id={`${id}-reflection-description`}>
            Mendukung markdown sederhana.
          </FieldDescription>
          <FieldError
            id={`${id}-reflection-error`}
            errors={[errors.reflection]}
          />
        </Field>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" onClick={onDone}>
            Batal
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Menyimpan…" : "Simpan"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
