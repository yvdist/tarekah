"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { useOpenKey } from "@/hooks/use-open-key";
import { describedBy, setFieldErrors } from "@/lib/form-errors";
import { createQuestion, updateQuestion } from "../actions";
import { QUESTION_CATEGORY_OPTIONS } from "../labels";
import {
  questionFormSchema,
  type QuestionFormInput,
  type QuestionFormValues,
} from "../schemas";

export type QuestionFormOptions = {
  applications: ReadonlyArray<{ id: string; label: string }>;
};

const EMPTY_VALUES: QuestionFormInput = {
  text: "",
  category: "other",
  applicationId: "",
  notes: "",
};

const FIELD_NAMES = ["text", "category", "applicationId", "notes"] as const;

// The select needs a non-empty value for "not set".
const APPLICATION_UNSET = "none";

export function QuestionFormDialog({
  questionId,
  defaultValues = EMPTY_VALUES,
  options,
  open,
  onOpenChange,
}: {
  // Present when editing; absent when creating.
  questionId?: string;
  defaultValues?: QuestionFormInput;
  options: QuestionFormOptions;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const formKey = useOpenKey(open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {questionId ? "Edit pertanyaan" : "Tambah pertanyaan"}
          </DialogTitle>
        </DialogHeader>
        <QuestionForm
          key={formKey}
          questionId={questionId}
          defaultValues={defaultValues}
          options={options}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function QuestionForm({
  questionId,
  defaultValues,
  options,
  onDone,
}: {
  questionId?: string;
  defaultValues: QuestionFormInput;
  options: QuestionFormOptions;
  onDone: () => void;
}) {
  const id = useId();
  const [pending, startTransition] = useTransition();
  const form = useForm<QuestionFormInput, unknown, QuestionFormValues>({
    resolver: zodResolver(questionFormSchema),
    defaultValues,
  });
  const { errors } = form.formState;
  const applicationOptions = [
    { value: APPLICATION_UNSET, label: "Tanpa lamaran" },
    ...options.applications.map((application) => ({
      value: application.id,
      label: application.label,
    })),
  ];

  // The server parses the same raw values again with the same schema, so the
  // untransformed form values are what gets sent.
  function submit() {
    const input = form.getValues();

    startTransition(async () => {
      try {
        const result = questionId
          ? await updateQuestion(questionId, input)
          : await createQuestion(input);

        if (!result.ok) {
          setFieldErrors(form.setError, result.fieldErrors, FIELD_NAMES);
          toast.error(result.message);
          return;
        }

        toast.success(
          questionId ? "Perubahan disimpan" : "Pertanyaan ditambahkan",
        );
        onDone();
      } catch {
        toast.error("Pertanyaan gagal disimpan. Coba lagi.");
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.text}>
          <FieldLabel htmlFor={`${id}-text`}>Pertanyaan</FieldLabel>
          <Textarea
            id={`${id}-text`}
            aria-describedby={describedBy(!!errors.text && `${id}-text-error`)}
            aria-required
            rows={3}
            placeholder="Tulis seperti interviewer menanyakannya"
            aria-invalid={!!errors.text}
            {...form.register("text")}
          />
          <FieldError id={`${id}-text-error`} errors={[errors.text]} />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={!!errors.category}>
            <FieldLabel htmlFor={`${id}-category`}>Kategori</FieldLabel>
            <Controller
              control={form.control}
              name="category"
              render={({ field }) => (
                <OptionSelect
                  id={`${id}-category`}
                  aria-describedby={describedBy(
                    !!errors.category && `${id}-category-error`,
                  )}
                  value={field.value}
                  onValueChange={field.onChange}
                  options={QUESTION_CATEGORY_OPTIONS}
                  invalid={!!errors.category}
                  className="w-full"
                />
              )}
            />
            <FieldError
              id={`${id}-category-error`}
              errors={[errors.category]}
            />
          </Field>

          <Field data-invalid={!!errors.applicationId}>
            <FieldLabel htmlFor={`${id}-applicationId`}>Lamaran</FieldLabel>
            <Controller
              control={form.control}
              name="applicationId"
              render={({ field }) => (
                <OptionSelect
                  id={`${id}-applicationId`}
                  aria-describedby={describedBy(
                    `${id}-applicationId-description`,
                    !!errors.applicationId && `${id}-applicationId-error`,
                  )}
                  value={field.value === "" ? APPLICATION_UNSET : field.value}
                  onValueChange={(value) =>
                    field.onChange(value === APPLICATION_UNSET ? "" : value)
                  }
                  options={applicationOptions}
                  invalid={!!errors.applicationId}
                  className="w-full"
                />
              )}
            />
            <FieldDescription id={`${id}-applicationId-description`}>
              Kalau pertanyaan ini terkait satu lamaran.
            </FieldDescription>
            <FieldError
              id={`${id}-applicationId-error`}
              errors={[errors.applicationId]}
            />
          </Field>
        </div>

        <Field data-invalid={!!errors.notes}>
          <FieldLabel htmlFor={`${id}-notes`}>Catatan</FieldLabel>
          <Textarea
            id={`${id}-notes`}
            aria-describedby={describedBy(
              `${id}-notes-description`,
              !!errors.notes && `${id}-notes-error`,
            )}
            rows={3}
            aria-invalid={!!errors.notes}
            {...form.register("notes")}
          />
          <FieldDescription id={`${id}-notes-description`}>
            Poin jawaban, hal yang ingin kamu ingat, atau sumber pertanyaannya.
          </FieldDescription>
          <FieldError id={`${id}-notes-error`} errors={[errors.notes]} />
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
