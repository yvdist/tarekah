import { StatusBadge } from "@/features/applications/components/status-badge";
import { StatusTimeline } from "@/features/applications/components/status-timeline";

// A made-up application that ended in a rejection, newest change first.
const EVENTS = [
  {
    id: "rejected",
    fromStatus: "interview",
    toStatus: "rejected",
    changedAt: new Date("2026-09-29T16:10:00+07:00"),
    note: "Belum rezekinya. Pertanyaannya kusimpan untuk interview berikutnya.",
  },
  {
    id: "interview",
    fromStatus: "applied",
    toStatus: "interview",
    changedAt: new Date("2026-09-18T10:00:00+07:00"),
    note: null,
  },
  {
    id: "applied",
    fromStatus: null,
    toStatus: "applied",
    changedAt: new Date("2026-09-04T08:45:00+07:00"),
    note: null,
  },
] as const;

// The application page's own timeline, with the line the app answers a
// rejection with.
export function TimelinePreview() {
  return (
    <div
      role="img"
      aria-label="Contoh riwayat satu lamaran: dilamar, interview, lalu ditolak, semuanya tetap tercatat."
      className="relative flex flex-col gap-5 rounded-lg border bg-card p-6 sm:p-7"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <p className="font-medium">Lentera Data</p>
          <p className="text-sm text-muted-foreground">Frontend Engineer</p>
        </div>
        <StatusBadge status="rejected" />
      </div>
      <StatusTimeline events={[...EVENTS]} />
      <p className="absolute right-4 -bottom-5 rounded-lg border bg-card px-3.5 py-2 text-sm shadow-sm">
        Dicatat. Satu léngkah tetap léngkah.
      </p>
    </div>
  );
}
