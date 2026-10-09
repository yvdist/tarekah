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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useOpenKey } from "@/hooks/use-open-key";
import { describedBy, setFieldErrors } from "@/lib/form-errors";
import { createInterview, updateInterview } from "../actions";
import { INTERVIEW_STAGE_OPTIONS } from "../labels";
import {
  interviewFormSchema,
  type InterviewFormInput,
  type InterviewFormValues,
} from "../schemas";

const EMPTY_VALUES: InterviewFormInput = {
  scheduledAt: "",
  stage: "hr",
  interviewers: "",
  questions: "",
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

        <Field data-invalid={!!errors.questions}>
          <FieldLabel htmlFor={`${id}-questions`}>
            Pertanyaan yang ditanyakan
          </FieldLabel>
          <Textarea
            id={`${id}-questions`}
            aria-describedby={describedBy(
              `${id}-questions-description`,
              !!errors.questions && `${id}-questions-error`,
            )}
            rows={6}
            aria-invalid={!!errors.questions}
            {...form.register("questions")}
          />
          <FieldDescription id={`${id}-questions-description`}>
            Satu pertanyaan per baris; tiap baris muncul terpisah di halaman
            Pertanyaan. Mendukung markdown sederhana: **tebal**, _miring_,
            `kode`, list, dan [link](https://…).
          </FieldDescription>
          <FieldError
            id={`${id}-questions-error`}
            errors={[errors.questions]}
          />
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

        <div className="flex justify-end gap-2">
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
