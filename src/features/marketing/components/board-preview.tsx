import { MegaMendung } from "@/components/brand/mega-mendung";
import type { ApplicationStatus, JobSource } from "@/db/schema/enum-values";
import {
  BoardCardBody,
  type BoardItem,
} from "@/features/applications/components/board-card-body";
import { StatusBadge } from "@/features/applications/components/status-badge";

function card(
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
const COLUMNS: ReadonlyArray<{
  status: ApplicationStatus;
  count: number;
  cards: BoardItem[];
}> = [
  {
    status: "applied",
    count: 5,
    cards: [
      card(
        "applied",
        "Tirta Logistik",
        "Frontend Developer",
        "linkedin",
        12,
        true,
      ),
      card("applied", "Batik Kode", "Fullstack Engineer", "kalibrr", 3),
    ],
  },
  {
    status: "screening",
    count: 3,
    cards: [
      card(
        "screening",
        "Wangsa Cloud",
        "Software Engineer",
        "linkedin",
        8,
        true,
      ),
      card("screening", "Teras Kopi", "Frontend Engineer", "jobstreet", 2),
    ],
  },
  {
    status: "interview",
    count: 3,
    cards: [
      card(
        "interview",
        "Arunika Labs",
        "Senior Frontend Engineer",
        "referral",
        4,
      ),
      card("interview", "Nara Travel", "Frontend Lead", "glints", 1),
    ],
  },
  {
    status: "offer",
    count: 1,
    cards: [
      card("offer", "Sagara Analytics", "Frontend Engineer", "referral", 0),
    ],
  },
];

// A still picture of the board, built from the board's own card. To a screen
// reader it is one image: the sample names are not content.
export function BoardPreview() {
  return (
    <div
      role="img"
      aria-label="Contoh board: lamaran dikelompokkan per status, dari Dilamar sampai Offer, dengan tanda kunyit pada yang perlu follow-up."
      className="grid grid-cols-2 gap-x-3 gap-y-5 rounded-lg border bg-muted p-3 sm:p-4 lg:grid-cols-4"
    >
      {COLUMNS.map((column) => (
        <div key={column.status} className="flex min-w-0 flex-col gap-2.5">
          <div className="flex h-7 items-center gap-2 px-1">
            <StatusBadge status={column.status} />
            {column.status === "offer" ? (
              <MegaMendung className="w-7 text-status-offer" />
            ) : null}
            <span className="ml-auto font-figure text-xs text-muted-foreground">
              {column.count}
            </span>
          </div>
          {column.cards.map((item) => (
            <BoardCardBody key={item.id} item={item} />
          ))}
        </div>
      ))}
    </div>
  );
}
