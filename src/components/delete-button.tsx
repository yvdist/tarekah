"use client";

import { Trash2 } from "lucide-react";
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
import type { ActionResult } from "@/lib/action-result";

// Icon button that asks for confirmation before running a delete action.
export function DeleteButton({
  action,
  label,
  title,
  description,
  successMessage,
}: {
  // A Server Action already bound to the id of the row.
  action: () => Promise<ActionResult>;
  // Accessible name of the button, for example "Hapus CV Backend v3".
  label: string;
  title: string;
  description: string;
  successMessage: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      try {
        const result = await action();

        if (result.ok) {
          toast.success(successMessage);
          setOpen(false);
        } else {
          toast.error(result.message);
        }
      } catch {
        toast.error("Gagal menghapus. Coba lagi.");
      }
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={label}
        onClick={() => setOpen(true)}
      >
        <Trash2 />
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
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
    </>
  );
}
