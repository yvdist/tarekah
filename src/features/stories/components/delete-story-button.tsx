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
import { deleteStory } from "../actions";

const SUCCESS_MESSAGE = "Cerita dihapus";
const FAILURE_MESSAGE = "Cerita gagal dihapus. Coba lagi.";

// On the detail page: the page no longer exists once the row is gone, so the
// action redirects to the list.
export function DeleteStoryButton({
  storyId,
  title,
}: {
  storyId: string;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      try {
        const result = await deleteStory(storyId, { redirectToList: true });

        if (result.ok) {
          toast.success(SUCCESS_MESSAGE);
          setOpen(false);
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
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Trash2 />
        Hapus
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus cerita ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Cerita &ldquo;{title}&rdquo; akan dihapus permanen. Pertanyaan
              yang tertaut tetap ada, hanya tautannya yang hilang.
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
    </>
  );
}
