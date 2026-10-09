"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BoardCardBody } from "@/features/applications/components/board-card-body";
import { cn } from "@/lib/utils";
import { sampleCard } from "../preview-board";

const LIMITS = [5, 7, 14];

// Made-up applications that are all still waiting for an answer.
const WAITING = [
  {
    status: "applied",
    companyName: "Tirta Logistik",
    position: "Frontend Developer",
    source: "linkedin",
    days: 12,
  },
  {
    status: "screening",
    companyName: "Wangsa Cloud",
    position: "Software Engineer",
    source: "linkedin",
    days: 8,
  },
  {
    status: "applied",
    companyName: "Batik Kode",
    position: "Fullstack Engineer",
    source: "kalibrr",
    days: 6,
  },
] as const;

// The follow-up setting, to try: the visitor picks how long to wait and the
// kunyit marks follow, by the same rule as in the app.
export function FollowUpDemo() {
  const [limit, setLimit] = useState(7);
  const cards = WAITING.map((item) =>
    sampleCard(
      item.status,
      item.companyName,
      item.position,
      item.source,
      item.days,
      item.days >= limit,
    ),
  );
  const due = cards.filter((card) => card.followUp.needsFollowUp).length;

  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-muted p-4 sm:p-5">
      <div
        role="group"
        aria-label="Lama menunggu kabar"
        className="flex flex-wrap items-center gap-x-3 gap-y-2"
      >
        <span className="text-sm text-muted-foreground">
          Tunggu kabar selama
        </span>
        <div className="flex gap-1">
          {LIMITS.map((value) => (
            <Button
              key={value}
              variant="ghost"
              size="sm"
              aria-pressed={value === limit}
              onClick={() => setLimit(value)}
              className={cn(
                "rounded-full px-3 font-figure hover:bg-card dark:hover:bg-card",
                value === limit &&
                  "bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent",
              )}
            >
              {value} hari
            </Button>
          ))}
        </div>
      </div>
      <ul className="flex flex-col gap-2.5">
        {cards.map((card) => (
          <li key={card.id} className="group">
            <BoardCardBody item={card} />
          </li>
        ))}
      </ul>
      <p aria-live="polite" className="flex items-center gap-2 px-1 text-sm">
        {due > 0 ? (
          <>
            <span
              aria-hidden
              className="size-1.5 shrink-0 rounded-full bg-kunyit"
            />
            {due} lamaran sudah waktunya disapa lagi.
          </>
        ) : (
          <span className="text-muted-foreground">
            Belum ada yang perlu disapa.
          </span>
        )}
      </p>
    </div>
  );
}
