"use client";

import { useDroppable } from "@dnd-kit/core";
import { ChevronsLeftRight, ChevronsRightLeft } from "lucide-react";
import type { ApplicationStatus } from "@/db/schema/enum-values";
import { cn } from "@/lib/utils";
import { STATUS_LABELS } from "../labels";
import { BoardCard, type BoardItem } from "./board-card";

export function BoardColumn({
  status,
  items,
  collapsed,
  onToggleCollapsed,
}: {
  status: ApplicationStatus;
  items: BoardItem[];
  collapsed: boolean;
  // Omitted for columns that cannot be collapsed.
  onToggleCollapsed?: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const label = STATUS_LABELS[status];

  if (collapsed) {
    return (
      <section
        ref={setNodeRef}
        aria-label={label}
        className={cn(
          "flex w-12 shrink-0 flex-col rounded-xl bg-muted/50",
          isOver && "ring-2 ring-ring",
        )}
      >
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-expanded={false}
          aria-label={`Buka kolom ${label}`}
          className="flex flex-1 flex-col items-center gap-3 rounded-xl py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronsLeftRight className="size-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{items.length}</span>
          <span className="font-medium [writing-mode:vertical-rl]">
            {label}
          </span>
        </button>
      </section>
    );
  }

  return (
    <section
      ref={setNodeRef}
      aria-label={label}
      className={cn(
        "flex min-h-40 w-64 shrink-0 flex-col gap-3 rounded-xl bg-muted/50 p-2",
        isOver && "ring-2 ring-ring",
      )}
    >
      <header className="flex items-center gap-2 px-1 pt-1 text-sm">
        <h2 className="font-medium">{label}</h2>
        <span className="text-xs text-muted-foreground">{items.length}</span>
        {onToggleCollapsed ? (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-expanded
            aria-label={`Ciutkan kolom ${label}`}
            className="ml-auto rounded-md p-1 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronsRightLeft className="size-4" />
          </button>
        ) : null}
      </header>
      {items.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id}>
              <BoardCard item={item} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-1 text-xs text-muted-foreground">Belum ada lamaran</p>
      )}
    </section>
  );
}
