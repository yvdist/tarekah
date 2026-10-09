import { Badge } from "@/components/ui/badge";
import type { ApplicationStatus } from "@/db/schema/enum-values";
import { STATUS_LABELS } from "../labels";

const STATUS_VARIANTS: Record<
  ApplicationStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  wishlist: "outline",
  applied: "secondary",
  screening: "secondary",
  technical_test: "secondary",
  interview: "secondary",
  offer: "default",
  rejected: "destructive",
  ghosted: "outline",
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>
  );
}
