"use client";

import { useDraggable } from "@dnd-kit/core";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { followUpLabel } from "../follow-up";
import { BoardCardBody, type BoardItem } from "./board-card-body";

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
