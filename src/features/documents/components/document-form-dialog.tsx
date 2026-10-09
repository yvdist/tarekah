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
import { setFieldErrors } from "@/lib/form-errors";
import { createDocument, updateDocument } from "../actions";
import { DOCUMENT_TYPE_OPTIONS } from "../labels";
import {
  documentFormSchema,
  type DocumentFormInput,
  type DocumentFormValues,
} from "../schemas";

const EMPTY_VALUES: DocumentFormInput = {
  type: "cv",
  label: "",
  url: "",
  notes: "",
};

const FIELD_NAMES = ["type", "label", "url", "notes"] as const;

export function DocumentFormDialog({
  documentId,
  defaultValues = EMPTY_VALUES,
  open,
  onOpenChange,
}: {
  // Present when editing; absent when creating.
  documentId?: string;
  defaultValues?: DocumentFormInput;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const formKey = useOpenKey(open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {documentId ? "Edit versi dokumen" : "Tambah versi dokumen"}
          </DialogTitle>
        </DialogHeader>
        <DocumentForm
          key={formKey}
          documentId={documentId}
          defaultValues={defaultValues}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function DocumentForm({
  documentId,
  defaultValues,
  onDone,
}: {
  documentId?: string;
  defaultValues: DocumentFormInput;
  onDone: () => void;
}) {
  const id = useId();
  const [pending, startTransition] = useTransition();
  const form = useForm<DocumentFormInput, unknown, DocumentFormValues>({
    resolver: zodResolver(documentFormSchema),
    defaultValues,
  });
  const { errors } = form.formState;

  // The server parses the same raw strings again with the same schema, so the
  // untransformed form values are what gets sent.
  function submit() {
    const input = form.getValues();

    startTransition(async () => {
      try {
        const result = documentId
          ? await updateDocument(documentId, input)
          : await createDocument(input);

        if (!result.ok) {
          setFieldErrors(form.setError, result.fieldErrors, FIELD_NAMES);
          toast.error(result.message);
          return;
        }

        toast.success(documentId ? "Perubahan disimpan" : "Versi ditambahkan");
        onDone();
      } catch {
        toast.error("Dokumen gagal disimpan. Coba lagi.");
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.type}>
          <FieldLabel htmlFor={`${id}-type`}>Jenis</FieldLabel>
          <Controller
            control={form.control}
            name="type"
            render={({ field }) => (
              <OptionSelect
                id={`${id}-type`}
                value={field.value}
                onValueChange={field.onChange}
                options={DOCUMENT_TYPE_OPTIONS}
                invalid={!!errors.type}
                disabled={!!documentId}
                className="w-full"
              />
            )}
          />
          {documentId ? (
            <FieldDescription>
              Jenis tidak bisa diubah setelah versi dibuat.
            </FieldDescription>
          ) : null}
          <FieldError errors={[errors.type]} />
        </Field>

        <Field data-invalid={!!errors.label}>
          <FieldLabel htmlFor={`${id}-label`}>Nama versi</FieldLabel>
          <Input
            id={`${id}-label`}
            placeholder="CV Backend v3"
            aria-invalid={!!errors.label}
            {...form.register("label")}
          />
          <FieldError errors={[errors.label]} />
        </Field>

        <Field data-invalid={!!errors.url}>
          <FieldLabel htmlFor={`${id}-url`}>Link file</FieldLabel>
          <Input
            id={`${id}-url`}
            type="url"
            placeholder="https://"
            aria-invalid={!!errors.url}
            {...form.register("url")}
          />
          <FieldDescription>
            Misalnya link Google Drive. File tidak diunggah ke sini.
          </FieldDescription>
          <FieldError errors={[errors.url]} />
        </Field>

        <Field data-invalid={!!errors.notes}>
          <FieldLabel htmlFor={`${id}-notes`}>Deskripsi</FieldLabel>
          <Textarea
            id={`${id}-notes`}
            rows={3}
            placeholder="Apa yang berubah di versi ini"
            aria-invalid={!!errors.notes}
            {...form.register("notes")}
          />
          <FieldError errors={[errors.notes]} />
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
