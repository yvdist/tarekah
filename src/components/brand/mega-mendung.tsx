import { cn } from "@/lib/utils";

export const CLOUD =
  "M34 104H206a20 20 0 0 0 6-39.1 27 27 0 0 0-31-29.4 36 36 0 0 0-61-13.5 31 31 0 0 0-52 14.5 25 25 0 0 0-31 27.5A20.5 20.5 0 0 0 34 104Z";

// Mega mendung, the Cirebon cloud, redrawn as thin single-colour lines. A
// signature, used sparingly: never a full background on a working page. The
// colour is the current text colour.
export function MegaMendung({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 112"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden
      className={cn("h-auto w-40", className)}
    >
      {[1, 0.8, 0.6].map((scale) => (
        <path
          key={scale}
          d={CLOUD}
          vectorEffect="non-scaling-stroke"
          transform={`translate(${120 * (1 - scale)} ${104 * (1 - scale)}) scale(${scale})`}
        />
      ))}
      <rect
        x="84"
        y="82"
        width="72"
        height="14"
        rx="7"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
