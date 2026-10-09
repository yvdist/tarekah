import type { ApplicationStatus } from "@/db/schema/enum-values";
import { STATUS_STYLES } from "@/features/applications/status-styles";
import { cn } from "@/lib/utils";
import { withConversion } from "../funnel";

// The funnel as a path of steps: one dot per stage in its status colour, the
// count under it, and between two dots the share that went on. A row on wide
// screens, a column on narrow ones.
export function StepPath({
  stages,
}: {
  stages: ReadonlyArray<{
    stage: ApplicationStatus;
    label: string;
    count: number;
  }>;
}) {
  const steps = withConversion(stages);

  return (
    <ol className="flex flex-col sm:grid sm:grid-cols-5">
      {steps.map((step, index) => {
        const last = index === steps.length - 1;

        return (
          <li
            key={step.stage}
            className="grid grid-cols-[0.75rem_1fr_auto] items-center gap-x-3 sm:flex sm:flex-col sm:items-stretch sm:gap-3"
          >
            <div className="contents sm:flex sm:h-4 sm:items-center sm:gap-2 sm:pr-2">
              <span
                aria-hidden
                className={cn(
                  "size-3 shrink-0 rounded-full",
                  STATUS_STYLES[step.stage].dot,
                )}
              />
              <span
                aria-hidden
                className="hidden h-px flex-1 bg-border sm:block"
              />
              {step.conversion !== null ? (
                <>
                  <span className="hidden font-figure text-[0.6875rem] text-muted-foreground sm:inline">
                    {step.conversion}%
                    <span className="sr-only"> lanjut ke tahap berikutnya</span>
                  </span>
                  <span
                    aria-hidden
                    className="hidden h-px flex-1 bg-border sm:block"
                  />
                </>
              ) : null}
            </div>
            <div className="flex items-baseline gap-2 sm:flex-col sm:gap-0">
              <span className="font-heading text-3xl leading-tight font-medium sm:text-4xl">
                {step.count}
              </span>
              <span className="text-sm text-muted-foreground">
                {step.label}
              </span>
            </div>
            {step.conversion !== null ? (
              <span className="font-figure text-xs text-muted-foreground sm:hidden">
                {step.conversion}% lanjut
              </span>
            ) : null}
            {last ? null : (
              <span
                aria-hidden
                className="col-start-1 mx-auto h-4 w-px bg-border sm:hidden"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
