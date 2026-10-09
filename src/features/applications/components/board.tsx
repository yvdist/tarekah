"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  startTransition,
  useId,
  useOptimistic,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { toast } from "sonner";
import {
  APPLICATION_STATUSES,
  type ApplicationStatus,
} from "@/db/schema/enum-values";
import { changeApplicationStatus } from "../actions";
import { FRESH_FOLLOW_UP_STATE } from "../follow-up";
import { STATUS_LABELS } from "../labels";
import { BoardCardBody, type BoardItem } from "./board-card";
import { BoardColumn } from "./board-column";

const COLLAPSIBLE_STATUSES: ReadonlySet<ApplicationStatus> = new Set([
  "rejected",
  "ghosted",
]);

// Cards are links, so Enter keeps its meaning (open) and only Space picks up.
const KEYBOARD_CODES = {
  start: ["Space"],
  cancel: ["Escape"],
  end: ["Space", "Enter"],
};

// The column under the pointer wins, so a card held by its edge does not land
// next door. Keyboard drags have no pointer and fall back to the card's rect.
const detectColumn: CollisionDetection = (args) => {
  const underPointer = pointerWithin(args);

  return underPointer.length > 0 ? underPointer : rectIntersection(args);
};

// Read out once when a card gets focus. Replaces dnd-kit's English default.
const SCREEN_READER_INSTRUCTIONS = {
  draggable:
    "Tekan Spasi untuk mengangkat kartu. Selama terangkat, pakai tombol panah untuk memindahkannya ke kolom lain, Spasi atau Enter untuk meletakkan, dan Escape untuk membatalkan. Tekan Enter tanpa mengangkat untuk membuka lamaran.",
};

const columnStatus = (id: string | number | undefined) =>
  APPLICATION_STATUSES.find((status) => status === id);

type Move = { id: string; status: ApplicationStatus };

function applyMove(items: BoardItem[], move: Move) {
  const moved = items.find((item) => item.id === move.id);

  if (!moved) {
    return items;
  }

  // Columns list the most recent status change first.
  return [
    { ...moved, status: move.status, followUp: FRESH_FOLLOW_UP_STATE },
    ...items.filter((item) => item.id !== move.id),
  ];
}

export function Board({ items }: { items: BoardItem[] }) {
  const dndId = useId();
  const [optimisticItems, moveCard] = useOptimistic(items, applyMove);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<ReadonlySet<ApplicationStatus>>(
    new Set(),
  );
  const suppressClick = useRef(false);

  const sensors = useSensors(
    // The distance keeps a plain click a click; the delay keeps a swipe a
    // scroll, so touch users long-press to pick a card up.
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, { keyboardCodes: KEYBOARD_CODES }),
  );

  const activeItem = optimisticItems.find((item) => item.id === activeId);

  const cardLabel = (id: string | number) => {
    const item = optimisticItems.find((value) => value.id === id);

    return item ? `${item.position} di ${item.companyName}` : "Kartu";
  };

  // Live-region messages for screen readers while a card is being moved.
  const announcements: Announcements = {
    onDragStart: ({ active }) => `${cardLabel(active.id)} diangkat.`,
    onDragOver: ({ active, over }) => {
      const status = columnStatus(over?.id);

      return status
        ? `${cardLabel(active.id)} berada di atas kolom ${STATUS_LABELS[status]}.`
        : `${cardLabel(active.id)} tidak berada di atas kolom mana pun.`;
    },
    onDragEnd: ({ active, over }) => {
      const status = columnStatus(over?.id);

      return status
        ? `${cardLabel(active.id)} diletakkan di kolom ${STATUS_LABELS[status]}.`
        : `${cardLabel(active.id)} dikembalikan ke kolom semula.`;
    },
    onDragCancel: ({ active }) =>
      `Dibatalkan. ${cardLabel(active.id)} dikembalikan ke kolom semula.`,
  };

  function handleDragStart(event: DragStartEvent) {
    suppressClick.current = true;
    setActiveId(String(event.active.id));
  }

  function endDrag() {
    setActiveId(null);
    // Releasing a card can still produce a click; let it pass first.
    setTimeout(() => {
      suppressClick.current = false;
    }, 0);
  }

  function handleDragEnd(event: DragEndEvent) {
    endDrag();

    const id = String(event.active.id);
    const status = APPLICATION_STATUSES.find(
      (value) => value === event.over?.id,
    );
    const current = optimisticItems.find((item) => item.id === id);

    if (!status || !current || current.status === status) {
      return;
    }

    // If the action fails nothing is revalidated, so the optimistic move is
    // dropped when the transition ends and the card returns to its column.
    startTransition(async () => {
      moveCard({ id, status });

      try {
        const result = await changeApplicationStatus(id, status);

        if (!result.ok) {
          toast.error(result.message);
        }
      } catch {
        toast.error("Status gagal diubah. Coba lagi.");
      }
    });
  }

  function handleClickCapture(event: MouseEvent) {
    if (suppressClick.current) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  function toggleCollapsed(status: ApplicationStatus) {
    setCollapsed((previous) => {
      const next = new Set(previous);

      if (!next.delete(status)) {
        next.add(status);
      }

      return next;
    });
  }

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={detectColumn}
      accessibility={{
        announcements,
        screenReaderInstructions: SCREEN_READER_INSTRUCTIONS,
      }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={endDrag}
    >
      <div
        className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-4"
        onClickCapture={handleClickCapture}
      >
        {APPLICATION_STATUSES.map((status) => (
          <BoardColumn
            key={status}
            status={status}
            items={optimisticItems.filter((item) => item.status === status)}
            collapsed={collapsed.has(status)}
            onToggleCollapsed={
              COLLAPSIBLE_STATUSES.has(status)
                ? () => toggleCollapsed(status)
                : undefined
            }
          />
        ))}
      </div>
      <DragOverlay>
        {activeItem ? (
          <BoardCardBody
            item={activeItem}
            className="cursor-grabbing shadow-lg"
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
