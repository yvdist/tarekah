"use client";

import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { DeleteButton } from "@/components/delete-button";
import { Button } from "@/components/ui/button";
import { deleteInterview } from "../actions";
import { toDateTimeLocalValue } from "../format";
import { INTERVIEW_STAGE_LABELS } from "../labels";
import type { InterviewListItem } from "../queries";
import { InterviewFormDialog } from "./interview-form-dialog";

export function AddInterviewButton({
  applicationId,
}: {
  applicationId: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus />
        Tambah interview
      </Button>
      <InterviewFormDialog
        applicationId={applicationId}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

export function InterviewRowActions({
  interview,
}: {
  interview: InterviewListItem;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const name = `interview ${INTERVIEW_STAGE_LABELS[interview.stage]}`;

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Edit ${name}`}
        onClick={() => setEditOpen(true)}
      >
        <Pencil />
      </Button>
      <DeleteButton
        action={deleteInterview.bind(null, interview.id)}
        label={`Hapus ${name}`}
        title="Hapus interview ini?"
        description="Catatan pertanyaan dan refleksi sesi ini akan dihapus permanen."
        successMessage="Interview dihapus"
      />
      <InterviewFormDialog
        applicationId={interview.applicationId}
        interviewId={interview.id}
        defaultValues={{
          scheduledAt: toDateTimeLocalValue(interview.scheduledAt),
          stage: interview.stage,
          interviewers: interview.interviewers ?? "",
          // The editor always shows at least one row.
          questions:
            interview.questions.length > 0
              ? interview.questions.map(({ id, text }) => ({ id, text }))
              : [{ id: "", text: "" }],
          reflection: interview.reflection ?? "",
        }}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  );
}
