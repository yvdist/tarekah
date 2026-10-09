"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { describedBy } from "@/lib/form-errors";
import { updateFollowUpSettings } from "../actions";
import {
  followUpSettingsSchema,
  type FollowUpSettingsInput,
  type FollowUpSettingsValues,
} from "../schemas";

export function FollowUpSettingsForm({
  defaultValues,
}: {
  defaultValues: FollowUpSettingsInput;
}) {
  const id = useId();
  const [pending, startTransition] = useTransition();
  const form = useForm<FollowUpSettingsInput, unknown, FollowUpSettingsValues>({
    resolver: zodResolver(followUpSettingsSchema),
    defaultValues,
  });
  const { errors } = form.formState;

  // The server parses the same raw strings again with the same schema, so the
  // untransformed form values are what gets sent.
  function submit() {
    const input = form.getValues();

    startTransition(async () => {
      try {
        const result = await updateFollowUpSettings(input);

        if (!result.ok) {
          for (const [name, messages] of Object.entries(
            result.fieldErrors ?? {},
          )) {
            if (name in defaultValues && messages[0]) {
              form.setError(name as keyof FollowUpSettingsInput, {
                message: messages[0],
              });
            }
          }
          toast.error(result.message);
          return;
        }

        toast.success("Pengaturan disimpan");
      } catch {
        toast.error("Pengaturan gagal disimpan. Coba lagi.");
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate>
      <FieldGroup>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={!!errors.followUpAfterDays}>
            <FieldLabel htmlFor={`${id}-followUpAfterDays`}>
              Batas follow-up (hari)
            </FieldLabel>
            <Input
              id={`${id}-followUpAfterDays`}
              aria-describedby={describedBy(
                `${id}-followUpAfterDays-description`,
                !!errors.followUpAfterDays && `${id}-followUpAfterDays-error`,
              )}
              aria-required
              inputMode="numeric"
              aria-invalid={!!errors.followUpAfterDays}
              {...form.register("followUpAfterDays")}
            />
            <FieldDescription id={`${id}-followUpAfterDays-description`}>
              Lamaran aktif ditandai perlu follow-up setelah sekian hari tanpa
              perubahan status atau follow-up.
            </FieldDescription>
            <FieldError
              id={`${id}-followUpAfterDays-error`}
              errors={[errors.followUpAfterDays]}
            />
          </Field>

          <Field data-invalid={!!errors.ghostedAfterDays}>
            <FieldLabel htmlFor={`${id}-ghostedAfterDays`}>
              Batas saran Tanpa kabar (hari)
            </FieldLabel>
            <Input
              id={`${id}-ghostedAfterDays`}
              aria-describedby={describedBy(
                `${id}-ghostedAfterDays-description`,
                !!errors.ghostedAfterDays && `${id}-ghostedAfterDays-error`,
              )}
              aria-required
              inputMode="numeric"
              aria-invalid={!!errors.ghostedAfterDays}
              {...form.register("ghostedAfterDays")}
            />
            <FieldDescription id={`${id}-ghostedAfterDays-description`}>
              Setelah sekian hari tanpa perubahan status, muncul saran
              memindahkan lamaran ke Tanpa kabar.
            </FieldDescription>
            <FieldError
              id={`${id}-ghostedAfterDays-error`}
              errors={[errors.ghostedAfterDays]}
            />
          </Field>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "Menyimpan…" : "Simpan"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
