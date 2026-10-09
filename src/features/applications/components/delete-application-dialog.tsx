"use client";

import { Trash2 } from "lucide-react";
import { unstable_rethrow } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteApplication } from "../actions";

const SUCCESS_MESSAGE = "Lamaran dihapus";
const FAILURE_MESSAGE = "Lamaran gagal dihapus. Coba lagi.";

export function DeleteApplicationDialog({
  applicationId,
  label,
  open,
  onOpenChange,
  redirectToList = false,
}: {
  applicationId: string;
  // Shown in the confirmation text, for example "Backend Engineer di Acme".
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Set on the detail page, which no longer exists once the row is gone.
  redirectToList?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      try {
        const result = await deleteApplication(applicationId, {
          redirectToList,
        });

        if (result.ok) {
          toast.success(SUCCESS_MESSAGE);
          onOpenChange(false);
        } else {
          toast.error(result.message);
        }
      } catch (error) {
        // A redirect from the action rejects the call with a navigation
        // signal. That is the success path; let Next.js finish navigating.
        try {
          unstable_rethrow(error);
        } catch (navigation) {
          toast.success(SUCCESS_MESSAGE);
          throw navigation;
        }

        toast.error(FAILURE_MESSAGE);
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus lamaran ini?</AlertDialogTitle>
          <AlertDialogDescription>
            Lamaran {label} beserta riwayat statusnya akan dihapus permanen dan
            tidak bisa dikembalikan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={handleDelete}
          >
            {pending ? "Menghapus…" : "Hapus"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function DeleteApplicationButton({
  applicationId,
  label,
}: {
  applicationId: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Trash2 />
        Hapus
      </Button>
      <DeleteApplicationDialog
        applicationId={applicationId}
        label={label}
        open={open}
        onOpenChange={setOpen}
        redirectToList
      />
    </>
  );
}
