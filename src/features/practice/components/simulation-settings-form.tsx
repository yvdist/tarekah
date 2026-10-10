"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useId, useTransition } from "react";
import { Controller, type FieldPath, useForm } from "react-hook-form";
import { toast } from "sonner";
import { OptionSelect } from "@/components/option-select";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { describedBy, setFieldErrors } from "@/lib/form-errors";
import { startSimulation } from "../actions";
import {
  INTERVIEW_TYPE_OPTIONS,
  PRACTICE_LANGUAGE_OPTIONS,
  PRACTICE_LEVEL_OPTIONS,
  PRACTICE_TONE_OPTIONS,
  SIMULATION_DURATION_OPTIONS,
} from "../labels";
import {
  type SimulationSettings,
  type SimulationSettingsInput,
  simulationSettingsSchema,
} from "../schemas";

// The select needs a non-empty value for "no application".
const NO_APPLICATION = "none";

type Name = FieldPath<SimulationSettingsInput>;

const FIELDS: ReadonlyArray<{
  name: Exclude<Name, "applicationId">;
  label: string;
  hint?: string;
  options: ReadonlyArray<{ value: string; label: string }>;
}> = [
  { name: "interviewType", label: "Jenis", options: INTERVIEW_TYPE_OPTIONS },
  { name: "level", label: "Level", options: PRACTICE_LEVEL_OPTIONS },
  { name: "language", label: "Bahasa", options: PRACTICE_LANGUAGE_OPTIONS },
  {
    name: "tone",
    label: "Nada interviewer",
    hint: "Mulai dari ramah. Menantang berarti lebih banyak menggali, tidak pernah merendahkan.",
    options: PRACTICE_TONE_OPTIONS,
  },
  {
    name: "duration",
    label: "Durasi",
    hint: "Perkiraan. Yang dibatasi jumlah pertanyaan, bukan waktumu.",
    options: SIMULATION_DURATION_OPTIONS,
  },
];

// The settings of a new simulation. The server parses the same raw values
// again with the same schema.
export function SimulationSettingsForm({
  defaults,
  applications,
}: {
  defaults: SimulationSettingsInput;
  applications: ReadonlyArray<{ id: string; label: string }>;
}) {
  const id = useId();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<SimulationSettingsInput, unknown, SimulationSettings>({
    resolver: zodResolver(simulationSettingsSchema),
    defaultValues: defaults,
  });
  const { errors } = form.formState;
  const applicationOptions = [
    { value: NO_APPLICATION, label: "Tanpa lamaran" },
    ...applications.map(({ id: value, label }) => ({ value, label })),
  ];

  function submit() {
    const input = form.getValues();

    startTransition(async () => {
      try {
        const result = await startSimulation(input);

        if (!result.ok) {
          setFieldErrors(form.setError, result.fieldErrors, [
            "applicationId",
            ...FIELDS.map(({ name }) => name),
          ]);
          toast.error(result.message);
          return;
        }

        router.push(`/practice/simulation/${result.data.sessionId}`);
      } catch {
        toast.error("Simulasi gagal dimulai. Coba lagi.");
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate>
      <FieldGroup>
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
                value={field.value === "" ? NO_APPLICATION : field.value}
                onValueChange={(value) =>
                  field.onChange(value === NO_APPLICATION ? "" : value)
                }
                options={applicationOptions}
                invalid={!!errors.applicationId}
                className="w-full"
              />
            )}
          />
          <FieldDescription id={`${id}-applicationId-description`}>
            Opsional. Dengan lamaran, interviewer membaca posisi, deskripsi
            pekerjaan dan catatan perusahaannya.
          </FieldDescription>
          <FieldError
            id={`${id}-applicationId-error`}
            errors={[errors.applicationId]}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          {FIELDS.map(({ name, label, hint, options }) => (
            <Field key={name} data-invalid={!!errors[name]}>
              <FieldLabel htmlFor={`${id}-${name}`}>{label}</FieldLabel>
              <Controller
                control={form.control}
                name={name}
                render={({ field }) => (
                  <OptionSelect
                    id={`${id}-${name}`}
                    aria-describedby={describedBy(
                      !!hint && `${id}-${name}-description`,
                      !!errors[name] && `${id}-${name}-error`,
                    )}
                    value={field.value}
                    onValueChange={field.onChange}
                    options={options}
                    invalid={!!errors[name]}
                    className="w-full"
                  />
                )}
              />
              {hint ? (
                <FieldDescription id={`${id}-${name}-description`}>
                  {hint}
                </FieldDescription>
              ) : null}
              <FieldError id={`${id}-${name}-error`} errors={[errors[name]]} />
            </Field>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
          <p className="text-xs text-muted-foreground">
            Jawabanmu dan isi lamaran yang dipilih dikirim ke provider AI yang
            kamu pilih di Pengaturan.
          </p>
          <Button type="submit" disabled={pending}>
            {pending ? "Menyiapkan…" : "Siapkan simulasi"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
