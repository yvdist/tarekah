"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import type { ApplicationStatus } from "@/db/schema/enum-values";
import { OptionSelect } from "@/components/option-select";
import { changeApplicationStatus } from "../actions";
import { STATUS_LABELS, STATUS_OPTIONS } from "../labels";

export function StatusSelect({
  applicationId,
  status,
}: {
  applicationId: string;
  status: ApplicationStatus;
}) {
  const [pending, startTransition] = useTransition();

  function handleChange(next: ApplicationStatus) {
    if (next === status) {
      return;
    }

    startTransition(async () => {
      try {
        const result = await changeApplicationStatus(applicationId, next);

        if (result.ok) {
          toast.success(`Status diubah ke ${STATUS_LABELS[next]}`);
        } else {
          toast.error(result.message);
        }
      } catch {
        toast.error("Status gagal diubah. Coba lagi.");
      }
    });
  }

  return (
    <OptionSelect
      aria-label="Ubah status"
      value={status}
      onValueChange={handleChange}
      options={STATUS_OPTIONS}
      disabled={pending}
      className="w-40"
    />
  );
}
