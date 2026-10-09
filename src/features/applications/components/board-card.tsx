"use client";

import { useDraggable } from "@dnd-kit/core";
import Link from "next/link";
import type { ApplicationStatus, JobSource } from "@/db/schema/enum-values";
import { cn } from "@/lib/utils";
import { followUpLabel, type FollowUpState } from "../follow-up";
import { formatDaysInStatus } from "../format";
import { SOURCE_LABELS } from "../labels";

export type BoardItem = {
  id: string;
  companyName: string;
  position: string;
  source: JobSource;
  status: ApplicationStatus;
  followUp: FollowUpState;
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
      title={followUpLabel(item.followUp) ?? undefined}
      className={cn(
        "group block touch-manipulation rounded-lg outline-none select-none [-webkit-touch-callout:none] focus-visible:ring-2 focus-visible:ring-ring",
        isDragging && "opacity-40",
      )}
      {...attributes}
      {...listeners}
    >
      <BoardCardBody item={item} />
    </Link>
  );
}

// A wishlist card has not been sent yet, so its count reads as time kept.
function daysLabel(item: BoardItem) {
  const days = item.followUp.daysInStatus;

  if (item.status !== "wishlist") {
    return formatDaysInStatus(days);
  }

  return days === 0 ? "disimpan hari ini" : `disimpan ${days} hari`;
}

// Also rendered on its own inside the drag overlay.
export function BoardCardBody({
  item,
  className,
}: {
  item: BoardItem;
  className?: string;
}) {
  // Past the follow-up limit the day count turns kunyit and a dot marks the
  // corner. The reason itself is read out and shown as the link's tooltip.
  const attention = followUpLabel(item.followUp);

  return (
    <div
      className={cn(
        "relative flex flex-col gap-2.5 rounded-lg border bg-card p-3.5 text-card-foreground transition-shadow group-hover:shadow-sm",
        className,
      )}
    >
      {attention ? (
        <span
          aria-hidden
          className="absolute top-3 right-3 size-1.5 rounded-full bg-kunyit"
        />
      ) : null}
      <div className="flex flex-col gap-1">
        <p className="pr-3 text-[0.9375rem] leading-snug font-medium break-words">
          {item.companyName}
        </p>
        <p className="text-[0.8125rem] break-words text-muted-foreground">
          {item.position}
        </p>
      </div>
      <div className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
        <span>{SOURCE_LABELS[item.source]}</span>
        <span
          className={cn(
            "font-figure",
            attention && "font-medium text-kunyit-tua",
          )}
        >
          {daysLabel(item)}
        </span>
      </div>
      {attention ? <span className="sr-only">{attention}</span> : null}
    </div>
  );
}
