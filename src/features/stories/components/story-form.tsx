"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { describedBy, setFieldErrors } from "@/lib/form-errors";
import { cn } from "@/lib/utils";
import { createStory, updateStory } from "../actions";
import { COMPETENCY_OPTIONS, STAR_PARTS } from "../labels";
import {
  storyFormSchema,
  type StoryFormInput,
  type StoryFormValues,
} from "../schemas";

const EMPTY_VALUES: StoryFormInput = {
  title: "",
  situation: "",
  task: "",
  action: "",
  result: "",
  competencies: [],
};

const FIELD_NAMES = [
  "title",
  "situation",
  "task",
  "action",
  "result",
  "competencies",
] as const;

export function StoryForm({
  storyId,
  defaultValues = EMPTY_VALUES,
  onSaved,
  onCancel,
  bare,
}: {
  // Present when editing; absent when creating.
  storyId?: string;
  defaultValues?: StoryFormInput;
  // For a form shown in a dialog: the caller decides what follows a save or a
  // cancel, instead of the form navigating to the story.
  onSaved?: (story: { id: string }) => void;
  onCancel?: () => void;
  // Without the card frame, inside a container that has its own.
  bare?: boolean;
}) {
  const router = useRouter();
  const id = useId();
  const [pending, startTransition] = useTransition();
  const form = useForm<StoryFormInput, unknown, StoryFormValues>({
    resolver: zodResolver(storyFormSchema),
    defaultValues,
  });
  const { errors } = form.formState;
  const cancelHref = storyId ? `/stories/${storyId}` : "/stories";

  // The server parses the same raw strings again with the same schema, so the
  // untransformed form values are what gets sent.
  function submit() {
    const input = form.getValues();

    startTransition(async () => {
      try {
        const result = storyId
          ? await updateStory(storyId, input)
          : await createStory(input);

        if (!result.ok) {
          setFieldErrors(form.setError, result.fieldErrors, FIELD_NAMES);
          toast.error(result.message);
          return;
        }

        toast.success(storyId ? "Perubahan disimpan" : "Cerita disimpan");

        if (onSaved) {
          onSaved(result.data);
        } else {
          router.push(`/stories/${result.data.id}`);
        }
      } catch {
        toast.error("Cerita gagal disimpan. Coba lagi.");
      }
    });
  }

  return (
    <form
      onSubmit={form.handleSubmit(submit)}
      noValidate
      className={cn(!bare && "rounded-lg border bg-card p-5 sm:p-6")}
    >
      <FieldGroup>
        <Field data-invalid={!!errors.title}>
          <FieldLabel htmlFor={`${id}-title`}>Judul</FieldLabel>
          <Input
            id={`${id}-title`}
            aria-describedby={describedBy(
              `${id}-title-description`,
              !!errors.title && `${id}-title-error`,
            )}
            aria-required
            placeholder="Misalnya: Migrasi monolith tanpa downtime"
            aria-invalid={!!errors.title}
            {...form.register("title")}
          />
          <FieldDescription id={`${id}-title-description`}>
            Nama singkat supaya kamu cepat ingat ceritanya.
          </FieldDescription>
          <FieldError id={`${id}-title-error`} errors={[errors.title]} />
        </Field>

        {STAR_PARTS.map((part) => (
          <Field key={part.name} data-invalid={!!errors[part.name]}>
            <FieldLabel htmlFor={`${id}-${part.name}`}>{part.label}</FieldLabel>
            <Textarea
              id={`${id}-${part.name}`}
              aria-describedby={describedBy(
                `${id}-${part.name}-description`,
                !!errors[part.name] && `${id}-${part.name}-error`,
              )}
              rows={4}
              aria-invalid={!!errors[part.name]}
              {...form.register(part.name)}
            />
            <FieldDescription id={`${id}-${part.name}-description`}>
              {part.hint}
            </FieldDescription>
            <FieldError
              id={`${id}-${part.name}-error`}
              errors={[errors[part.name]]}
            />
          </Field>
        ))}

        <Field data-invalid={!!errors.competencies}>
          <FieldLabel id={`${id}-competencies`}>Kompetensi</FieldLabel>
          <Controller
            control={form.control}
            name="competencies"
            render={({ field }) => (
              <div
                role="group"
                aria-labelledby={`${id}-competencies`}
                aria-describedby={`${id}-competencies-description`}
                className="grid gap-2 sm:grid-cols-2"
              >
                {COMPETENCY_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={field.value.includes(option.value)}
                      onCheckedChange={(checked) =>
                        field.onChange(
                          checked
                            ? [...field.value, option.value]
                            : field.value.filter(
                                (value) => value !== option.value,
                              ),
                        )
                      }
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            )}
          />
          <FieldDescription id={`${id}-competencies-description`}>
            Apa yang cerita ini tunjukkan tentang kamu. Boleh lebih dari satu.
          </FieldDescription>
          <FieldError errors={[errors.competencies]} />
        </Field>

        <div className="flex justify-end gap-2 border-t pt-5">
          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel}>
              Batal
            </Button>
          ) : (
            <Link
              href={cancelHref}
              className={buttonVariants({ variant: "outline" })}
            >
              Batal
            </Link>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? "Menyimpan…" : "Simpan"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
