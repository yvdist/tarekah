"use client";

import { Archive, ArchiveRestore, Pencil, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { DeleteButton } from "@/components/delete-button";
import { Button } from "@/components/ui/button";
import { deleteDocument, setDocumentArchived } from "../actions";
import type { DocumentListItem } from "../queries";
import { DocumentFormDialog } from "./document-form-dialog";

export function AddDocumentButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus />
        Tambah versi
      </Button>
      <DocumentFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

export function DocumentRowActions({
  document,
}: {
  document: DocumentListItem;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function toggleArchived() {
    startTransition(async () => {
      try {
        const result = await setDocumentArchived(
          document.id,
          !document.isArchived,
        );

        if (result.ok) {
          toast.success(
            document.isArchived ? "Versi dipulihkan" : "Versi diarsipkan",
          );
        } else {
          toast.error(result.message);
        }
      } catch {
        toast.error("Gagal mengubah arsip. Coba lagi.");
      }
    });
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Edit ${document.label}`}
        onClick={() => setEditOpen(true)}
      >
        <Pencil />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={
          document.isArchived
            ? `Pulihkan ${document.label}`
            : `Arsipkan ${document.label}`
        }
        disabled={pending}
        onClick={toggleArchived}
      >
        {document.isArchived ? <ArchiveRestore /> : <Archive />}
      </Button>
      <DeleteButton
        action={deleteDocument.bind(null, document.id)}
        label={`Hapus ${document.label}`}
        title="Hapus versi ini?"
        description={
          document.usageCount > 0
            ? `${document.label} dipakai ${document.usageCount} lamaran. Lamaran itu tetap ada, tetapi tidak lagi mencatat versi ini. Pertimbangkan mengarsipkan saja.`
            : `${document.label} akan dihapus permanen.`
        }
        successMessage="Versi dihapus"
      />
      <DocumentFormDialog
        documentId={document.id}
        defaultValues={{
          type: document.type,
          label: document.label,
          url: document.url ?? "",
          notes: document.notes ?? "",
        }}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  );
}
