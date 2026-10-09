"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { OptionSelect } from "@/components/option-select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { createContact, updateContact } from "../actions";
import { CONTACT_ROLE_OPTIONS } from "../labels";
import {
  contactFormSchema,
  type ContactFormInput,
  type ContactFormValues,
} from "../schemas";

export type ContactFormOptions = {
  companies: ReadonlyArray<{ id: string; name: string }>;
  applications: ReadonlyArray<{ id: string; label: string }>;
};

const EMPTY_VALUES: ContactFormInput = {
  name: "",
  role: "recruiter",
  companyId: "",
  email: "",
  linkedinUrl: "",
  notes: "",
  applicationIds: [],
};

const FIELD_NAMES = [
  "name",
  "role",
  "companyId",
  "email",
  "linkedinUrl",
  "notes",
  "applicationIds",
] as const;

// The select needs a non-empty value for "not set".
const COMPANY_UNSET = "none";

export function ContactFormDialog({
  contactId,
  defaultValues = EMPTY_VALUES,
  options,
  open,
  onOpenChange,
}: {
  // Present when editing; absent when creating.
  contactId?: string;
  defaultValues?: ContactFormInput;
  options: ContactFormOptions;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const formKey = useOpenKey(open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {contactId ? "Edit kontak" : "Tambah kontak"}
          </DialogTitle>
        </DialogHeader>
        <ContactForm
          key={formKey}
          contactId={contactId}
          defaultValues={defaultValues}
          options={options}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function ContactForm({
  contactId,
  defaultValues,
  options,
  onDone,
}: {
  contactId?: string;
  defaultValues: ContactFormInput;
  options: ContactFormOptions;
  onDone: () => void;
}) {
  const id = useId();
  const [pending, startTransition] = useTransition();
  const form = useForm<ContactFormInput, unknown, ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues,
  });
  const { errors } = form.formState;
  const companyOptions = [
    { value: COMPANY_UNSET, label: "Tanpa perusahaan" },
    ...options.companies.map((company) => ({
      value: company.id,
      label: company.name,
    })),
  ];

  // The server parses the same raw values again with the same schema, so the
  // untransformed form values are what gets sent.
  function submit() {
    const input = form.getValues();

    startTransition(async () => {
      try {
        const result = contactId
          ? await updateContact(contactId, input)
          : await createContact(input);

        if (!result.ok) {
          setFieldErrors(form.setError, result.fieldErrors, FIELD_NAMES);
          toast.error(result.message);
          return;
        }

        toast.success(contactId ? "Perubahan disimpan" : "Kontak ditambahkan");
        onDone();
      } catch {
        toast.error("Kontak gagal disimpan. Coba lagi.");
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate>
      <FieldGroup>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor={`${id}-name`}>Nama</FieldLabel>
            <Input
              id={`${id}-name`}
              aria-describedby={describedBy(
                !!errors.name && `${id}-name-error`,
              )}
              aria-required
              aria-invalid={!!errors.name}
              {...form.register("name")}
            />
            <FieldError id={`${id}-name-error`} errors={[errors.name]} />
          </Field>

          <Field data-invalid={!!errors.role}>
            <FieldLabel htmlFor={`${id}-role`}>Peran</FieldLabel>
            <Controller
              control={form.control}
              name="role"
              render={({ field }) => (
                <OptionSelect
                  id={`${id}-role`}
                  aria-describedby={describedBy(
                    !!errors.role && `${id}-role-error`,
                  )}
                  value={field.value}
                  onValueChange={field.onChange}
                  options={CONTACT_ROLE_OPTIONS}
                  invalid={!!errors.role}
                  className="w-full"
                />
              )}
            />
            <FieldError id={`${id}-role-error`} errors={[errors.role]} />
          </Field>

          <Field data-invalid={!!errors.companyId} className="sm:col-span-2">
            <FieldLabel htmlFor={`${id}-companyId`}>Perusahaan</FieldLabel>
            <Controller
              control={form.control}
              name="companyId"
              render={({ field }) => (
                <OptionSelect
                  id={`${id}-companyId`}
                  aria-describedby={describedBy(
                    `${id}-companyId-description`,
                    !!errors.companyId && `${id}-companyId-error`,
                  )}
                  value={field.value === "" ? COMPANY_UNSET : field.value}
                  onValueChange={(value) =>
                    field.onChange(value === COMPANY_UNSET ? "" : value)
                  }
                  options={companyOptions}
                  invalid={!!errors.companyId}
                  className="w-full"
                />
              )}
            />
            <FieldDescription id={`${id}-companyId-description`}>
              Perusahaan baru dibuat lewat form lamaran.
            </FieldDescription>
            <FieldError
              id={`${id}-companyId-error`}
              errors={[errors.companyId]}
            />
          </Field>

          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor={`${id}-email`}>Email</FieldLabel>
            <Input
              id={`${id}-email`}
              aria-describedby={describedBy(
                !!errors.email && `${id}-email-error`,
              )}
              type="email"
              aria-invalid={!!errors.email}
              {...form.register("email")}
            />
            <FieldError id={`${id}-email-error`} errors={[errors.email]} />
          </Field>

          <Field data-invalid={!!errors.linkedinUrl}>
            <FieldLabel htmlFor={`${id}-linkedinUrl`}>LinkedIn</FieldLabel>
            <Input
              id={`${id}-linkedinUrl`}
              aria-describedby={describedBy(
                !!errors.linkedinUrl && `${id}-linkedinUrl-error`,
              )}
              type="url"
              placeholder="https://"
              aria-invalid={!!errors.linkedinUrl}
              {...form.register("linkedinUrl")}
            />
            <FieldError
              id={`${id}-linkedinUrl-error`}
              errors={[errors.linkedinUrl]}
            />
          </Field>
        </div>

        <Field data-invalid={!!errors.notes}>
          <FieldLabel htmlFor={`${id}-notes`}>Catatan</FieldLabel>
          <Textarea
            id={`${id}-notes`}
            aria-describedby={describedBy(
              !!errors.notes && `${id}-notes-error`,
            )}
            rows={3}
            aria-invalid={!!errors.notes}
            {...form.register("notes")}
          />
          <FieldError id={`${id}-notes-error`} errors={[errors.notes]} />
        </Field>

        <Field data-invalid={!!errors.applicationIds}>
          <FieldLabel id={`${id}-applicationIds`}>Lamaran terkait</FieldLabel>
          {options.applications.length === 0 ? (
            <FieldDescription>Belum ada lamaran.</FieldDescription>
          ) : (
            <Controller
              control={form.control}
              name="applicationIds"
              render={({ field }) => (
                <div
                  role="group"
                  aria-labelledby={`${id}-applicationIds`}
                  className="flex max-h-40 flex-col gap-2 overflow-y-auto rounded-lg border p-3"
                >
                  {options.applications.map((application) => (
                    <label
                      key={application.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={field.value.includes(application.id)}
                        onCheckedChange={(checked) =>
                          field.onChange(
                            checked
                              ? [...field.value, application.id]
                              : field.value.filter(
                                  (value) => value !== application.id,
                                ),
                          )
                        }
                      />
                      {application.label}
                    </label>
                  ))}
                </div>
              )}
            />
          )}
          <FieldError errors={[errors.applicationIds]} />
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
