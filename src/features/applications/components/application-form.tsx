"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { DocumentType } from "@/db/schema/enum-values";
import type { DocumentOption } from "@/features/documents/queries";
import { OptionSelect } from "@/components/option-select";
import { describedBy } from "@/lib/form-errors";
import { createApplication, updateApplication } from "../actions";
import { SOURCE_OPTIONS, STATUS_OPTIONS, WORK_TYPE_OPTIONS } from "../labels";
import {
  applicationFormSchema,
  type ApplicationFormInput,
  type ApplicationFormValues,
} from "../schemas";

const EMPTY_VALUES: ApplicationFormInput = {
  companyName: "",
  position: "",
  jobUrl: "",
  source: "linkedin",
  sourceDetail: "",
  salaryMin: "",
  salaryMax: "",
  location: "",
  workType: "",
  appliedAt: "",
  status: "wishlist",
  cvDocumentId: "",
  coverLetterDocumentId: "",
  notes: "",
};

// The select needs a non-empty value for "not set".
const WORK_TYPE_UNSET = "unset";
const WORK_TYPE_SELECT_OPTIONS = [
  { value: WORK_TYPE_UNSET, label: "Belum ditentukan" },
  ...WORK_TYPE_OPTIONS,
];

const DOCUMENT_UNSET = "none";

// Archived versions are offered only when the application already uses them.
function documentSelectOptions(
  documents: DocumentOption[],
  type: DocumentType,
  selectedId: string,
) {
  return [
    { value: DOCUMENT_UNSET, label: "Tidak ada" },
    ...documents
      .filter(
        (document) =>
          document.type === type &&
          (!document.isArchived || document.id === selectedId),
      )
      .map((document) => ({
        value: document.id,
        label: document.isArchived
          ? `${document.label} (diarsipkan)`
          : document.label,
      })),
  ];
}

export function ApplicationForm({
  applicationId,
  defaultValues = EMPTY_VALUES,
  companyNames,
  documentOptions,
}: {
  // Present when editing; absent when creating.
  applicationId?: string;
  defaultValues?: ApplicationFormInput;
  companyNames: string[];
  documentOptions: DocumentOption[];
}) {
  const router = useRouter();
  const id = useId();
  const [pending, startTransition] = useTransition();
  const form = useForm<ApplicationFormInput, unknown, ApplicationFormValues>({
    resolver: zodResolver(applicationFormSchema),
    defaultValues,
  });
  const { errors } = form.formState;
  const cancelHref = applicationId
    ? `/applications/${applicationId}`
    : "/applications";

  // The server parses the same raw strings again with the same schema, so the
  // untransformed form values are what gets sent.
  function submit() {
    const input = form.getValues();

    startTransition(async () => {
      try {
        const result = applicationId
          ? await updateApplication(applicationId, input)
          : await createApplication(input);

        if (!result.ok) {
          for (const [name, messages] of Object.entries(
            result.fieldErrors ?? {},
          )) {
            if (name in EMPTY_VALUES && messages[0]) {
              form.setError(name as keyof ApplicationFormInput, {
                message: messages[0],
              });
            }
          }
          toast.error(result.message);
          return;
        }

        toast.success(
          applicationId ? "Perubahan disimpan" : "Lamaran ditambahkan",
        );
        router.push(`/applications/${result.data.id}`);
      } catch {
        toast.error("Lamaran gagal disimpan. Coba lagi.");
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate>
      <FieldGroup>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={!!errors.companyName}>
            <FieldLabel htmlFor={`${id}-companyName`}>Perusahaan</FieldLabel>
            <Input
              id={`${id}-companyName`}
              aria-describedby={describedBy(
                `${id}-companyName-description`,
                !!errors.companyName && `${id}-companyName-error`,
              )}
              aria-required
              list={`${id}-companies`}
              autoComplete="off"
              aria-invalid={!!errors.companyName}
              {...form.register("companyName")}
            />
            <datalist id={`${id}-companies`}>
              {companyNames.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            <FieldDescription id={`${id}-companyName-description`}>
              Pilih perusahaan yang sudah ada atau ketik nama baru.
            </FieldDescription>
            <FieldError
              id={`${id}-companyName-error`}
              errors={[errors.companyName]}
            />
          </Field>

          <Field data-invalid={!!errors.position}>
            <FieldLabel htmlFor={`${id}-position`}>Posisi</FieldLabel>
            <Input
              id={`${id}-position`}
              aria-describedby={describedBy(
                !!errors.position && `${id}-position-error`,
              )}
              aria-required
              aria-invalid={!!errors.position}
              {...form.register("position")}
            />
            <FieldError
              id={`${id}-position-error`}
              errors={[errors.position]}
            />
          </Field>

          <Field data-invalid={!!errors.status}>
            <FieldLabel htmlFor={`${id}-status`}>Status</FieldLabel>
            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <OptionSelect
                  id={`${id}-status`}
                  aria-describedby={describedBy(
                    !!errors.status && `${id}-status-error`,
                  )}
                  value={field.value}
                  onValueChange={field.onChange}
                  options={STATUS_OPTIONS}
                  invalid={!!errors.status}
                  className="w-full"
                />
              )}
            />
            <FieldError id={`${id}-status-error`} errors={[errors.status]} />
          </Field>

          <Field data-invalid={!!errors.appliedAt}>
            <FieldLabel htmlFor={`${id}-appliedAt`}>Tanggal apply</FieldLabel>
            <Input
              id={`${id}-appliedAt`}
              aria-describedby={describedBy(
                `${id}-appliedAt-description`,
                !!errors.appliedAt && `${id}-appliedAt-error`,
              )}
              type="date"
              aria-invalid={!!errors.appliedAt}
              {...form.register("appliedAt")}
            />
            <FieldDescription id={`${id}-appliedAt-description`}>
              Kosongkan selama masih wishlist.
            </FieldDescription>
            <FieldError
              id={`${id}-appliedAt-error`}
              errors={[errors.appliedAt]}
            />
          </Field>

          <Field data-invalid={!!errors.source}>
            <FieldLabel htmlFor={`${id}-source`}>Sumber</FieldLabel>
            <Controller
              control={form.control}
              name="source"
              render={({ field }) => (
                <OptionSelect
                  id={`${id}-source`}
                  aria-describedby={describedBy(
                    !!errors.source && `${id}-source-error`,
                  )}
                  value={field.value}
                  onValueChange={field.onChange}
                  options={SOURCE_OPTIONS}
                  invalid={!!errors.source}
                  className="w-full"
                />
              )}
            />
            <FieldError id={`${id}-source-error`} errors={[errors.source]} />
          </Field>

          <Field data-invalid={!!errors.sourceDetail}>
            <FieldLabel htmlFor={`${id}-sourceDetail`}>
              Detail sumber
            </FieldLabel>
            <Input
              id={`${id}-sourceDetail`}
              aria-describedby={describedBy(
                !!errors.sourceDetail && `${id}-sourceDetail-error`,
              )}
              placeholder="Nama pemberi referral atau sumber lain"
              aria-invalid={!!errors.sourceDetail}
              {...form.register("sourceDetail")}
            />
            <FieldError
              id={`${id}-sourceDetail-error`}
              errors={[errors.sourceDetail]}
            />
          </Field>

          <Field data-invalid={!!errors.workType}>
            <FieldLabel htmlFor={`${id}-workType`}>Tipe kerja</FieldLabel>
            <Controller
              control={form.control}
              name="workType"
              render={({ field }) => (
                <OptionSelect
                  id={`${id}-workType`}
                  aria-describedby={describedBy(
                    !!errors.workType && `${id}-workType-error`,
                  )}
                  value={field.value === "" ? WORK_TYPE_UNSET : field.value}
                  onValueChange={(value) =>
                    field.onChange(value === WORK_TYPE_UNSET ? "" : value)
                  }
                  options={WORK_TYPE_SELECT_OPTIONS}
                  invalid={!!errors.workType}
                  className="w-full"
                />
              )}
            />
            <FieldError
              id={`${id}-workType-error`}
              errors={[errors.workType]}
            />
          </Field>

          <Field data-invalid={!!errors.location}>
            <FieldLabel htmlFor={`${id}-location`}>Lokasi</FieldLabel>
            <Input
              id={`${id}-location`}
              aria-describedby={describedBy(
                !!errors.location && `${id}-location-error`,
              )}
              aria-invalid={!!errors.location}
              {...form.register("location")}
            />
            <FieldError
              id={`${id}-location-error`}
              errors={[errors.location]}
            />
          </Field>

          <Field data-invalid={!!errors.salaryMin}>
            <FieldLabel htmlFor={`${id}-salaryMin`}>
              Gaji minimum (IDR)
            </FieldLabel>
            <Input
              id={`${id}-salaryMin`}
              aria-describedby={describedBy(
                !!errors.salaryMin && `${id}-salaryMin-error`,
              )}
              inputMode="numeric"
              aria-invalid={!!errors.salaryMin}
              {...form.register("salaryMin")}
            />
            <FieldError
              id={`${id}-salaryMin-error`}
              errors={[errors.salaryMin]}
            />
          </Field>

          <Field data-invalid={!!errors.salaryMax}>
            <FieldLabel htmlFor={`${id}-salaryMax`}>
              Gaji maksimum (IDR)
            </FieldLabel>
            <Input
              id={`${id}-salaryMax`}
              aria-describedby={describedBy(
                !!errors.salaryMax && `${id}-salaryMax-error`,
              )}
              inputMode="numeric"
              aria-invalid={!!errors.salaryMax}
              {...form.register("salaryMax")}
            />
            <FieldError
              id={`${id}-salaryMax-error`}
              errors={[errors.salaryMax]}
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={!!errors.cvDocumentId}>
            <FieldLabel htmlFor={`${id}-cvDocumentId`}>Versi CV</FieldLabel>
            <Controller
              control={form.control}
              name="cvDocumentId"
              render={({ field }) => (
                <OptionSelect
                  id={`${id}-cvDocumentId`}
                  aria-describedby={describedBy(
                    !!errors.cvDocumentId && `${id}-cvDocumentId-error`,
                  )}
                  value={field.value === "" ? DOCUMENT_UNSET : field.value}
                  onValueChange={(value) =>
                    field.onChange(value === DOCUMENT_UNSET ? "" : value)
                  }
                  options={documentSelectOptions(
                    documentOptions,
                    "cv",
                    defaultValues.cvDocumentId,
                  )}
                  invalid={!!errors.cvDocumentId}
                  className="w-full"
                />
              )}
            />
            <FieldError
              id={`${id}-cvDocumentId-error`}
              errors={[errors.cvDocumentId]}
            />
          </Field>

          <Field data-invalid={!!errors.coverLetterDocumentId}>
            <FieldLabel htmlFor={`${id}-coverLetterDocumentId`}>
              Versi cover letter
            </FieldLabel>
            <Controller
              control={form.control}
              name="coverLetterDocumentId"
              render={({ field }) => (
                <OptionSelect
                  id={`${id}-coverLetterDocumentId`}
                  aria-describedby={describedBy(
                    `${id}-coverLetterDocumentId-description`,
                    !!errors.coverLetterDocumentId &&
                      `${id}-coverLetterDocumentId-error`,
                  )}
                  value={field.value === "" ? DOCUMENT_UNSET : field.value}
                  onValueChange={(value) =>
                    field.onChange(value === DOCUMENT_UNSET ? "" : value)
                  }
                  options={documentSelectOptions(
                    documentOptions,
                    "cover_letter",
                    defaultValues.coverLetterDocumentId,
                  )}
                  invalid={!!errors.coverLetterDocumentId}
                  className="w-full"
                />
              )}
            />
            <FieldDescription id={`${id}-coverLetterDocumentId-description`}>
              Kelola versi di halaman Dokumen.
            </FieldDescription>
            <FieldError
              id={`${id}-coverLetterDocumentId-error`}
              errors={[errors.coverLetterDocumentId]}
            />
          </Field>
        </div>

        <Field data-invalid={!!errors.jobUrl}>
          <FieldLabel htmlFor={`${id}-jobUrl`}>Link lowongan</FieldLabel>
          <Input
            id={`${id}-jobUrl`}
            aria-describedby={describedBy(
              !!errors.jobUrl && `${id}-jobUrl-error`,
            )}
            type="url"
            placeholder="https://"
            aria-invalid={!!errors.jobUrl}
            {...form.register("jobUrl")}
          />
          <FieldError id={`${id}-jobUrl-error`} errors={[errors.jobUrl]} />
        </Field>

        <Field data-invalid={!!errors.notes}>
          <FieldLabel htmlFor={`${id}-notes`}>Catatan</FieldLabel>
          <Textarea
            id={`${id}-notes`}
            aria-describedby={describedBy(
              !!errors.notes && `${id}-notes-error`,
            )}
            rows={5}
            aria-invalid={!!errors.notes}
            {...form.register("notes")}
          />
          <FieldError id={`${id}-notes-error`} errors={[errors.notes]} />
        </Field>

        <div className="flex justify-end gap-2">
          <Link
            href={cancelHref}
            className={buttonVariants({ variant: "outline" })}
          >
            Batal
          </Link>
          <Button type="submit" disabled={pending}>
            {pending ? "Menyimpan…" : "Simpan"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
