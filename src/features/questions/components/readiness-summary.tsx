import type { ReadinessSummary } from "../filter";
import { QUESTION_READINESS_LABELS } from "../labels";

// Three counts, no percentage: readiness is self-assessed, not scored.
export function ReadinessSummaryLine({
  summary,
}: {
  summary: ReadinessSummary;
}) {
  const parts = [
    ["ready", summary.ready],
    ["somewhat", summary.somewhat],
    ["not_ready", summary.not_ready],
  ] as const;

  return (
    <p className="text-sm text-muted-foreground" aria-live="polite">
      {parts.map(([readiness, total], index) => (
        <span key={readiness}>
          {index > 0 ? <span aria-hidden> · </span> : null}
          <span className="font-figure text-foreground">{total}</span>{" "}
          {QUESTION_READINESS_LABELS[readiness].toLowerCase()}
        </span>
      ))}
    </p>
  );
}
