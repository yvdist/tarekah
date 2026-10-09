import type { ApplicationStatus, JobSource } from "@/db/schema/enum-values";
import type { BoardItem } from "@/features/applications/components/board-card-body";
import { FRESH_FOLLOW_UP_STATE } from "@/features/applications/follow-up";

export type PreviewColumn = {
  status: ApplicationStatus;
  count: number;
  cards: BoardItem[];
};

export function sampleCard(
  status: ApplicationStatus,
  companyName: string,
  position: string,
  source: JobSource,
  days: number,
  needsFollowUp = false,
): BoardItem {
  return {
    id: companyName,
    companyName,
    position,
    source,
    status,
    followUp: {
      daysInStatus: days,
      daysSinceActivity: days,
      needsFollowUp,
      suggestGhosted: false,
    },
  };
}

// Made-up applications. The counts are larger than the cards shown, as on a
// board that continues below the fold.
export const PREVIEW_COLUMNS: readonly PreviewColumn[] = [
  {
    status: "applied",
    count: 5,
    cards: [
      sampleCard(
        "applied",
        "Tirta Logistik",
        "Frontend Developer",
        "linkedin",
        12,
        true,
      ),
      sampleCard("applied", "Batik Kode", "Fullstack Engineer", "kalibrr", 6),
    ],
  },
  {
    status: "screening",
    count: 3,
    cards: [
      sampleCard(
        "screening",
        "Wangsa Cloud",
        "Software Engineer",
        "linkedin",
        8,
        true,
      ),
      sampleCard(
        "screening",
        "Teras Kopi",
        "Frontend Engineer",
        "jobstreet",
        2,
      ),
    ],
  },
  {
    status: "interview",
    count: 3,
    cards: [
      sampleCard(
        "interview",
        "Arunika Labs",
        "Senior Frontend Engineer",
        "referral",
        4,
      ),
      sampleCard("interview", "Nara Travel", "Frontend Lead", "glints", 1),
    ],
  },
  {
    status: "offer",
    count: 1,
    cards: [
      sampleCard(
        "offer",
        "Sagara Analytics",
        "Frontend Engineer",
        "referral",
        0,
      ),
    ],
  },
];

// The card the preview moves to Offer once the visitor reaches it.
export const MOVING_CARD_ID = "Arunika Labs";

// The board after a card is dropped on another column: it joins the end of
// that column as a card whose status changed just now.
export function moveCard(
  columns: readonly PreviewColumn[],
  id: string,
  to: ApplicationStatus,
): PreviewColumn[] {
  const card = columns
    .flatMap((column) => column.cards)
    .find((item) => item.id === id);

  if (!card || card.status === to) {
    return [...columns];
  }

  return columns.map((column) => {
    if (column.status === card.status) {
      return {
        ...column,
        count: column.count - 1,
        cards: column.cards.filter((item) => item.id !== id),
      };
    }

    if (column.status === to) {
      return {
        ...column,
        count: column.count + 1,
        cards: [
          ...column.cards,
          { ...card, status: to, followUp: FRESH_FOLLOW_UP_STATE },
        ],
      };
    }

    return column;
  });
}
