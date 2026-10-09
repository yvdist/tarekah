import { Badge } from "@/components/ui/badge";
import { followUpLabel, type FollowUpState } from "../follow-up";

// Renders nothing for an application that needs no attention.
export function FollowUpBadge({ followUp }: { followUp: FollowUpState }) {
  const label = followUpLabel(followUp);

  if (!label) {
    return null;
  }

  return (
    <Badge variant="warning">
      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-kunyit" />
      {label}
    </Badge>
  );
}
