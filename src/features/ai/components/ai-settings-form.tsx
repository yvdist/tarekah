"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
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
import { Input } from "@/components/ui/input";
import type { AiProvider } from "@/db/schema/enum-values";
import { describedBy, setFieldErrors } from "@/lib/form-errors";
import { saveAiCredential } from "../actions";
import {
  AI_PROVIDER_OPTIONS,
  defaultModel,
  SUGGESTED_MODELS,
} from "../providers";
import {
  aiCredentialFormSchema,
  type AiCredentialFormInput,
  type AiCredentialFormValues,
} from "../schemas";
import type { SavedCredential } from "./ai-credential-list";

const FIELD_NAMES = ["provider", "apiKey", "model"] as const;

// The select's entry for "an id that is not in the list".
const CUSTOM = "custom";

const isSuggested = (provider: AiProvider, model: string) =>
  SUGGESTED_MODELS[provider].includes(model);

export function AiSettingsForm({
  credentials,
  initialProvider,
}: {
  credentials: ReadonlyArray<SavedCredential>;
  initialProvider: AiProvider;
}) {
  const id = useId();
  const [pending, startTransition] = useTransition();
  const savedFor = (provider: AiProvider) =>
    credentials.find((credential) => credential.provider === provider);
  const modelFor = (provider: AiProvider) =>
    savedFor(provider)?.model ?? defaultModel(provider);
  const form = useForm<AiCredentialFormInput, unknown, AiCredentialFormValues>({
    resolver: zodResolver(aiCredentialFormSchema),
    defaultValues: {
      provider: initialProvider,
      apiKey: "",
      model: modelFor(initialProvider),
    },
  });
  const { errors } = form.formState;
  const provider = useWatch({ control: form.control, name: "provider" });
  const model = useWatch({ control: form.control, name: "model" });
  const [custom, setCustom] = useState(
    () => !isSuggested(initialProvider, modelFor(initialProvider)),
  );
  const saved = savedFor(provider);
  const modelOptions = [
    ...SUGGESTED_MODELS[provider].map((value) => ({ value, label: value })),
    { value: CUSTOM, label: "ID lain…" },
  ];

  function changeProvider(next: AiProvider) {
    const nextModel = modelFor(next);

    form.setValue("provider", next);
    form.setValue("model", nextModel);
    form.clearErrors();
    setCustom(!isSuggested(next, nextModel));
  }

  function changeModel(next: string) {
    setCustom(next === CUSTOM);
    form.setValue("model", next === CUSTOM ? "" : next, {
      shouldValidate: next !== CUSTOM,
    });
  }

  // The server parses the same raw strings again with the same schema.
  function submit() {
    const input = form.getValues();

    startTransition(async () => {
      try {
        const result = await saveAiCredential(input);

        if (!result.ok) {
          setFieldErrors(form.setError, result.fieldErrors, FIELD_NAMES);
          toast.error(result.message);
          return;
        }

        // The key has done its job; it should not sit in the field.
        form.resetField("apiKey");
        toast.success(input.apiKey === "" ? "Model disimpan" : "Key disimpan");
      } catch {
        toast.error("Key gagal disimpan. Coba lagi.");
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate>
      <FieldGroup>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={!!errors.provider}>
            <FieldLabel htmlFor={`${id}-provider`}>Provider</FieldLabel>
            <OptionSelect
              id={`${id}-provider`}
              value={provider}
              onValueChange={changeProvider}
              options={AI_PROVIDER_OPTIONS}
              invalid={!!errors.provider}
              aria-describedby={describedBy(
                !!errors.provider && `${id}-provider-error`,
              )}
            />
            <FieldError
              id={`${id}-provider-error`}
              errors={[errors.provider]}
            />
          </Field>

          <Field data-invalid={!custom && !!errors.model}>
            <FieldLabel htmlFor={`${id}-model-choice`}>Model</FieldLabel>
            <OptionSelect
              id={`${id}-model-choice`}
              value={custom ? CUSTOM : model}
              onValueChange={changeModel}
              options={modelOptions}
              invalid={!custom && !!errors.model}
              aria-describedby={describedBy(
                !custom && !!errors.model && `${id}-model-error`,
              )}
            />
            {custom ? null : (
              <FieldError id={`${id}-model-error`} errors={[errors.model]} />
            )}
          </Field>
        </div>

        {custom ? (
          <Field data-invalid={!!errors.model}>
            <FieldLabel htmlFor={`${id}-model`}>ID model</FieldLabel>
            <Input
              id={`${id}-model`}
              className="font-mono"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              aria-required
              aria-invalid={!!errors.model}
              aria-describedby={describedBy(
                `${id}-model-description`,
                !!errors.model && `${id}-model-error`,
              )}
              {...form.register("model")}
            />
            <FieldDescription id={`${id}-model-description`}>
              Tulis persis seperti di dokumentasi provider.
            </FieldDescription>
            <FieldError id={`${id}-model-error`} errors={[errors.model]} />
          </Field>
        ) : null}

        <Field data-invalid={!!errors.apiKey}>
          <FieldLabel htmlFor={`${id}-apiKey`}>API key</FieldLabel>
          <Input
            id={`${id}-apiKey`}
            type="password"
            className="font-mono"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            aria-required={!saved}
            aria-invalid={!!errors.apiKey}
            aria-describedby={describedBy(
              `${id}-apiKey-description`,
              !!errors.apiKey && `${id}-apiKey-error`,
            )}
            {...form.register("apiKey")}
          />
          <FieldDescription id={`${id}-apiKey-description`}>
            {saved
              ? `Sudah ada key berakhiran ${saved.keyLast4}. Kosongkan untuk tetap memakainya, atau isi untuk menggantinya.`
              : "Dibuat di akun provider-mu. Disimpan terenkripsi dan tidak pernah ditampilkan lagi."}
          </FieldDescription>
          <FieldError id={`${id}-apiKey-error`} errors={[errors.apiKey]} />
        </Field>

        <div className="flex justify-end border-t pt-5">
          <Button type="submit" variant="outline" disabled={pending}>
            {pending ? "Menyimpan…" : saved ? "Simpan perubahan" : "Simpan key"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
