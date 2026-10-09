"use client";

import { Check, Ghost } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { changeApplicationStatus, markFollowedUp } from "../actions";
import { STATUS_LABELS } from "../labels";

export function FollowUpActions({
  applicationId,
  suggestGhosted,
}: {
  applicationId: string;
  suggestGhosted: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function handleFollowedUp() {
    startTransition(async () => {
      try {
        const result = await markFollowedUp(applicationId);

        if (result.ok) {
          toast.success("Follow-up dicatat");
        } else {
          toast.error(result.message);
        }
      } catch {
        toast.error("Follow-up gagal dicatat. Coba lagi.");
      }
    });
  }

  function handleGhosted() {
    startTransition(async () => {
      try {
        const result = await changeApplicationStatus(applicationId, "ghosted");

        if (result.ok) {
          toast.success(`Status diubah ke ${STATUS_LABELS.ghosted}`);
        } else {
          toast.error(result.message);
        }
      } catch {
        toast.error("Status gagal diubah. Coba lagi.");
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={handleFollowedUp}
      >
        <Check />
        Sudah follow-up
      </Button>
      {suggestGhosted ? (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={handleGhosted}
        >
          <Ghost />
          Pindahkan ke {STATUS_LABELS.ghosted}
        </Button>
      ) : null}
    </div>
  );
}
