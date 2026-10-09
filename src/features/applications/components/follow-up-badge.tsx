import { Badge } from "@/components/ui/badge";
import type { FollowUpState } from "../follow-up";
import { STATUS_LABELS } from "../labels";

// Renders nothing for an application that needs no attention. The ghosted
// suggestion wins when both apply.
export function FollowUpBadge({ followUp }: { followUp: FollowUpState }) {
  if (followUp.suggestGhosted) {
    return (
      <Badge variant="warning">
        Saran: {STATUS_LABELS.ghosted} · {followUp.daysInStatus} hari
      </Badge>
    );
  }

  if (followUp.needsFollowUp) {
    return (
      <Badge variant="warning">
        Perlu follow-up · {followUp.daysSinceActivity} hari
      </Badge>
    );
  }

  return null;
}
