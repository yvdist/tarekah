import type { ApplicationStatus } from "@/db/schema/enum-values";

// One colour per status, used wherever a status shows: badges, board columns,
// the dashboard path. `dot` is the solid mark, `badge` the tinted pill.
// The classes are written out in full so Tailwind can see them.
export const STATUS_STYLES: Record<
  ApplicationStatus,
  { dot: string; badge: string }
> = {
  wishlist: {
    dot: "bg-status-wishlist",
    badge:
      "bg-status-wishlist/16 text-status-wishlist-fg dark:bg-status-wishlist/22",
  },
  applied: {
    dot: "bg-status-applied",
    badge:
      "bg-status-applied/16 text-status-applied-fg dark:bg-status-applied/22",
  },
  screening: {
    dot: "bg-status-screening",
    badge:
      "bg-status-screening/16 text-status-screening-fg dark:bg-status-screening/22",
  },
  technical_test: {
    dot: "bg-status-technical-test",
    badge:
      "bg-status-technical-test/16 text-status-technical-test-fg dark:bg-status-technical-test/22",
  },
  interview: {
    dot: "bg-status-interview",
    badge:
      "bg-status-interview/16 text-status-interview-fg dark:bg-status-interview/22",
  },
  offer: {
    dot: "bg-status-offer",
    badge: "bg-status-offer/16 text-status-offer-fg dark:bg-status-offer/22",
  },
  // Finished: a fainter tint than the stages still in play.
  rejected: {
    dot: "bg-status-rejected",
    badge:
      "bg-status-rejected/10 text-status-rejected-fg dark:bg-status-rejected/16",
  },
  // Finished without an answer: hollow dot, dashed outline, no fill.
  ghosted: {
    dot: "border border-status-ghosted",
    badge: "border-dashed border-status-ghosted/70 text-status-ghosted-fg",
  },
};
