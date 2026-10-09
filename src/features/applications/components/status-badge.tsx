import { Badge } from "@/components/ui/badge";
import type { ApplicationStatus } from "@/db/schema/enum-values";
import { cn } from "@/lib/utils";
import { STATUS_LABELS } from "../labels";
import { STATUS_STYLES } from "../status-styles";

export function StatusBadge({
  status,
  className,
}: {
  status: ApplicationStatus;
  className?: string;
}) {
  const styles = STATUS_STYLES[status];

  return (
    <Badge variant="status" className={cn(styles.badge, className)}>
      <span
        aria-hidden
        className={cn("size-1.5 shrink-0 rounded-full", styles.dot)}
      />
      {STATUS_LABELS[status]}
    </Badge>
  );
}
