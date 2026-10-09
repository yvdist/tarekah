"use client";

import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { DeleteButton } from "@/components/delete-button";
import { Button } from "@/components/ui/button";
import { deleteContact } from "../actions";
import type { ContactListItem } from "../queries";
import {
  ContactFormDialog,
  type ContactFormOptions,
} from "./contact-form-dialog";

export function AddContactButton({
  options,
  variant,
  size,
}: {
  options: ContactFormOptions;
} & Pick<React.ComponentProps<typeof Button>, "variant" | "size">) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}>
        <Plus />
        Tambah kontak
      </Button>
      <ContactFormDialog options={options} open={open} onOpenChange={setOpen} />
    </>
  );
}

export function ContactRowActions({
  contact,
  options,
}: {
  contact: ContactListItem;
  options: ContactFormOptions;
}) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Edit ${contact.name}`}
        onClick={() => setEditOpen(true)}
      >
        <Pencil />
      </Button>
      <DeleteButton
        action={deleteContact.bind(null, contact.id)}
        label={`Hapus ${contact.name}`}
        title="Hapus kontak ini?"
        description={`${contact.name} akan dihapus permanen, termasuk tautannya ke lamaran.`}
        successMessage="Kontak dihapus"
      />
      <ContactFormDialog
        contactId={contact.id}
        defaultValues={{
          name: contact.name,
          role: contact.role,
          companyId: contact.companyId ?? "",
          email: contact.email ?? "",
          linkedinUrl: contact.linkedinUrl ?? "",
          notes: contact.notes ?? "",
          applicationIds: contact.applications.map(
            (application) => application.id,
          ),
        }}
        options={options}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  );
}
