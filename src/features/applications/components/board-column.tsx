"use client";

import { useDroppable } from "@dnd-kit/core";
import { ChevronsLeftRight, ChevronsRightLeft, Plus } from "lucide-react";
import Link from "next/link";
import { MegaMendung } from "@/components/brand/mega-mendung";
import type { ApplicationStatus } from "@/db/schema/enum-values";
import { cn } from "@/lib/utils";
import { STATUS_LABELS } from "../labels";
import { STATUS_STYLES } from "../status-styles";
import { BoardCard, type BoardItem } from "./board-card";
import { StatusBadge } from "./status-badge";

export function BoardColumn({
  status,
  items,
  emptyLabel,
  collapsed,
  onToggleCollapsed,
  celebration = 0,
}: {
  status: ApplicationStatus;
  items: BoardItem[];
  emptyLabel: string;
  collapsed: boolean;
  // Omitted for columns that cannot be collapsed.
  onToggleCollapsed?: () => void;
  // Goes up each time a card lands here and the cloud should bloom. Only the
  // offer column has a cloud.
  celebration?: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const label = STATUS_LABELS[status];

  if (collapsed) {
    return (
      <section
        ref={setNodeRef}
        aria-label={label}
        className={cn(
          "flex w-12 shrink-0 snap-start flex-col rounded-lg bg-muted",
          isOver && "ring-2 ring-ring",
        )}
      >
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-expanded={false}
          aria-label={`Buka kolom ${label}`}
          className="flex flex-1 flex-col items-center gap-3 rounded-lg py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronsLeftRight className="size-4 text-muted-foreground" />
          <span className="font-figure text-xs text-muted-foreground">
            {items.length}
          </span>
          <span
            aria-hidden
            className={cn("size-1.5 rounded-full", STATUS_STYLES[status].dot)}
          />
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
        "flex min-h-40 w-[82vw] shrink-0 snap-start flex-col gap-2.5 rounded-lg bg-muted p-2.5 sm:w-64",
        isOver && "ring-2 ring-ring",
      )}
    >
      <header className="flex h-7 items-center gap-2 px-1">
        <h2>
          <StatusBadge status={status} />
        </h2>
        {status === "offer" ? (
          // The cloud is the reward. A new key restarts the bloom.
          <MegaMendung
            key={celebration}
            className={cn(
              "w-7 text-status-offer",
              celebration > 0 && "motion-safe:animate-cloud-bloom",
            )}
          />
        ) : null}
        <span className="ml-auto font-figure text-xs text-muted-foreground">
          {items.length}
        </span>
        {onToggleCollapsed ? (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-expanded
            aria-label={`Ciutkan kolom ${label}`}
            className="rounded-md p-1 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronsRightLeft className="size-4" />
          </button>
        ) : null}
      </header>
      {items.length > 0 ? (
        <ul className="flex flex-col gap-2.5">
          {items.map((item) => (
            <li key={item.id}>
              <BoardCard item={item} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-1 text-xs text-muted-foreground">{emptyLabel}</p>
      )}
      {status === "wishlist" ? (
        <Link
          href="/applications/new"
          aria-label="Tambah ke wishlist"
          className="flex h-9 items-center justify-center gap-1.5 rounded-md text-sm text-muted-foreground outline-none hover:bg-card hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus aria-hidden className="size-4" />
          Tambah
        </Link>
      ) : null}
    </section>
  );
}
