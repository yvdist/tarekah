"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { MegaMendung } from "@/components/brand/mega-mendung";
import { BoardCardBody } from "@/features/applications/components/board-card-body";
import { StatusBadge } from "@/features/applications/components/status-badge";
import { useInViewOnce } from "@/hooks/use-in-view-once";
import { cn } from "@/lib/utils";
import { MOVING_CARD_ID, PREVIEW_COLUMNS, moveCard } from "../preview-board";

const AFTER_MOVE = moveCard(PREVIEW_COLUMNS, MOVING_CARD_ID, "offer");

// Long enough to notice the board before something on it moves, and for the
// hero to finish arriving when the board is on screen from the start.
const PAUSE_MS = 1600;
const FLIGHT_MS = 750;

// A picture of the board, built from the board's own card. Once the visitor
// reaches it, one card moves to Offer and the cloud blooms, as on the real
// board. To a screen reader it is one image: the sample names are not content.
export function BoardPreview() {
  const [ref, inView] = useInViewOnce<HTMLDivElement>(0.9);
  const [moved, setMoved] = useState(false);
  const cards = useRef(new Map<string, HTMLElement>());
  const before = useRef(new Map<string, DOMRect>());

  useEffect(() => {
    if (
      !inView ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      before.current = new Map(
        [...cards.current].map(([id, node]) => [
          id,
          node.getBoundingClientRect(),
        ]),
      );
      setMoved(true);
    }, PAUSE_MS);

    return () => window.clearTimeout(timer);
  }, [inView]);

  // Every card that ended up somewhere else glides there from where it was.
  useLayoutEffect(() => {
    for (const [id, node] of cards.current) {
      const from = before.current.get(id);

      if (!from) {
        continue;
      }

      const to = node.getBoundingClientRect();
      const x = from.left - to.left;
      const y = from.top - to.top;

      if (x !== 0 || y !== 0) {
        node.animate([{ translate: `${x}px ${y}px` }, { translate: "0 0" }], {
          duration: FLIGHT_MS,
          easing: "cubic-bezier(0.2, 0.7, 0.2, 1)",
        });
      }
    }

    before.current = new Map();
  }, [moved]);

  const columns = moved ? AFTER_MOVE : PREVIEW_COLUMNS;

  return (
    <div
      ref={ref}
      role="img"
      aria-label="Contoh board: lamaran dikelompokkan per status, dari Dilamar sampai Offer, dengan tanda kunyit pada yang perlu follow-up."
      className="relative grid grid-cols-2 gap-x-3 gap-y-5 rounded-lg border bg-muted p-3 sm:p-4 lg:grid-cols-4"
    >
      {columns.map((column) => (
        <div
          key={column.status}
          data-status={column.status}
          className="flex min-w-0 flex-col gap-2.5"
        >
          <div className="flex h-7 items-center gap-2 px-1">
            <StatusBadge status={column.status} />
            {column.status === "offer" ? (
              <MegaMendung
                className={cn(
                  "w-7 text-status-offer",
                  moved && "animate-cloud-bloom [animation-delay:650ms]",
                )}
              />
            ) : null}
            <span className="ml-auto font-figure text-xs text-muted-foreground">
              {column.count}
            </span>
          </div>
          {column.cards.map((item) => (
            <div
              key={item.id}
              ref={(node) => {
                if (node) {
                  cards.current.set(item.id, node);
                } else {
                  cards.current.delete(item.id);
                }
              }}
              className={cn(
                "group",
                moved && item.id === MOVING_CARD_ID && "relative z-10",
              )}
            >
              <BoardCardBody item={item} />
            </div>
          ))}
        </div>
      ))}
      {moved ? (
        <p className="absolute right-4 -bottom-5 animate-in rounded-lg border bg-card px-3.5 py-2 text-sm shadow-sm duration-500 fill-mode-both [animation-delay:1100ms] fade-in slide-in-from-bottom-2">
          Hasil tarékah-mu.
        </p>
      ) : null}
    </div>
  );
}
