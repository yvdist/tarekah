"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { updateCompany } from "../actions";
import {
  COMPANY_NOTES_MAX_LENGTH,
  type CompanyFormInput,
  companyFormSchema,
  type CompanyFormValues,
} from "../schemas";

const FIELD_NAMES = ["website", "notes"] as const;

// The Edit button of a company's page and the dialog it opens.
export function CompanyEditButton({
  company,
}: {
  company: {
    id: string;
    name: string;
    website: string | null;
    notes: string | null;
  };
}) {
  const [open, setOpen] = useState(false);
  const formKey = useOpenKey(open);

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Pencil />
        Edit
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit {company.name}</DialogTitle>
            <DialogDescription>
              Nama perusahaan mengikuti lamaranmu dan tidak diubah di sini.
            </DialogDescription>
          </DialogHeader>
          <CompanyForm
            key={formKey}
            companyId={company.id}
            defaultValues={{
              website: company.website ?? "",
              notes: company.notes ?? "",
            }}
            onDone={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function CompanyForm({
  companyId,
  defaultValues,
  onDone,
}: {
  companyId: string;
  defaultValues: CompanyFormInput;
  onDone: () => void;
}) {
  const id = useId();
  const [pending, startTransition] = useTransition();
  const form = useForm<CompanyFormInput, unknown, CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues,
  });
  const { errors } = form.formState;
  const length = useWatch({ control: form.control, name: "notes" }).length;

  // The server parses the same raw strings again with the same schema.
  function submit() {
    const input = form.getValues();

    startTransition(async () => {
      try {
        const result = await updateCompany(companyId, input);

        if (!result.ok) {
          setFieldErrors(form.setError, result.fieldErrors, FIELD_NAMES);
          toast.error(result.message);
          return;
        }

        toast.success("Perubahan disimpan");
        onDone();
      } catch {
        toast.error("Perusahaan gagal disimpan. Coba lagi.");
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.website}>
          <FieldLabel htmlFor={`${id}-website`}>Website</FieldLabel>
          <Input
            id={`${id}-website`}
            aria-describedby={describedBy(
              !!errors.website && `${id}-website-error`,
            )}
            type="url"
            placeholder="https://"
            aria-invalid={!!errors.website}
            {...form.register("website")}
          />
          <FieldError id={`${id}-website-error`} errors={[errors.website]} />
        </Field>

        <Field data-invalid={!!errors.notes}>
          <FieldLabel htmlFor={`${id}-notes`}>Catatan</FieldLabel>
          <Textarea
            id={`${id}-notes`}
            aria-describedby={describedBy(
              `${id}-notes-description`,
              !!errors.notes && `${id}-notes-error`,
            )}
            rows={6}
            placeholder="Produknya, timnya, budayanya, apa yang kamu dengar dari orang dalam."
            aria-invalid={!!errors.notes}
            {...form.register("notes")}
          />
          <FieldDescription
            id={`${id}-notes-description`}
            className="flex justify-between gap-4"
          >
            <span>
              Dibaca interviewer saat simulasi untuk lamaran ke perusahaan ini,
              jadi ikut dikirim ke provider AI-mu.
            </span>
            <span className="font-figure">
              {length}/{COMPANY_NOTES_MAX_LENGTH}
            </span>
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
