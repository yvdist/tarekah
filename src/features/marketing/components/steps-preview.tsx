import type { ApplicationStatus } from "@/db/schema/enum-values";
import { STATUS_LABELS } from "@/features/applications/labels";
import { StepPath } from "@/features/dashboard/components/step-path";

// Made-up numbers, drawn with the dashboard's own step path.
const STAGES: ReadonlyArray<{ stage: ApplicationStatus; count: number }> = [
  { stage: "applied", count: 42 },
  { stage: "screening", count: 17 },
  { stage: "technical_test", count: 10 },
  { stage: "interview", count: 7 },
  { stage: "offer", count: 1 },
];

export function StepsPreview() {
  return (
    <div
      role="img"
      aria-label="Contoh ringkasan: 42 léngkah ikhtiar, dengan jumlah lamaran yang sampai di tiap tahap dari Dilamar sampai Offer."
      className="flex flex-col gap-6 rounded-lg border bg-card p-6 sm:p-7"
    >
      <p className="flex flex-wrap items-baseline gap-x-3">
        <span className="font-heading text-6xl leading-none font-medium tracking-tight">
          {STAGES[0].count}
        </span>
        <span className="font-heading text-xl text-muted-foreground">
          léngkah ikhtiar
        </span>
      </p>
      <StepPath
        stages={STAGES.map((row) => ({
          ...row,
          label: STATUS_LABELS[row.stage],
        }))}
      />
    </div>
  );
}
