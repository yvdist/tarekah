"use client";

import { useDraggable } from "@dnd-kit/core";
import Link from "next/link";
import type { ApplicationStatus, JobSource } from "@/db/schema/enum-values";
import { cn } from "@/lib/utils";
import { formatDaysInStatus } from "../format";
import { SOURCE_LABELS } from "../labels";

export type BoardItem = {
  id: string;
  companyName: string;
  position: string;
  source: JobSource;
  status: ApplicationStatus;
  daysInStatus: number;
};

export function BoardCard({ item }: { item: BoardItem }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
    attributes: { role: "link" },
  });

  return (
    <Link
      ref={setNodeRef}
      href={`/applications/${item.id}`}
      draggable={false}
      className={cn(
        "block touch-manipulation rounded-lg outline-none select-none [-webkit-touch-callout:none] focus-visible:ring-2 focus-visible:ring-ring",
        isDragging && "opacity-40",
      )}
      {...attributes}
      {...listeners}
    >
      <BoardCardBody item={item} />
    </Link>
  );
}

// Also rendered on its own inside the drag overlay.
export function BoardCardBody({
  item,
  className,
}: {
  item: BoardItem;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border bg-card p-3 text-sm text-card-foreground shadow-xs",
        className,
      )}
    >
      <div className="flex flex-col gap-0.5">
        <p className="font-medium break-words">{item.companyName}</p>
        <p className="break-words text-muted-foreground">{item.position}</p>
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{SOURCE_LABELS[item.source]}</span>
        <span>{formatDaysInStatus(item.daysInStatus)}</span>
      </div>
    </div>
  );
}
