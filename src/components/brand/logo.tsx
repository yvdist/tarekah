import { cn } from "@/lib/utils";
import {
  MARK_RISE,
  MARK_STEM,
  MARK_STROKE_WIDTH,
  MARK_VIEW_BOX,
} from "./mark-paths";

// Nila on kertas, kertas on the dark background; the rising stroke is kunyit
// in both.
const INK = "text-primary dark:text-foreground";

export function Logomark({ className }: { className?: string }) {
  return (
    <svg
      viewBox={MARK_VIEW_BOX}
      fill="none"
      strokeWidth={MARK_STROKE_WIDTH}
      strokeLinecap="round"
      aria-hidden
      className={cn("size-8 shrink-0", INK, className)}
    >
      <path d={MARK_STEM} className="stroke-current" />
      <path d={MARK_RISE} className="stroke-kunyit" />
    </svg>
  );
}

// An "e" whose accent is the mark's rising stroke. The letter is a plain "e",
// so whoever renders this also provides the real word to screen readers.
export function AccentE({ className }: { className?: string }) {
  return (
    <span className="relative inline-block">
      e
      <span
        className={cn(
          "absolute top-[0.48em] left-[0.15em] h-[0.05em] w-[0.22em] -rotate-[20deg] rounded-full bg-kunyit",
          className,
        )}
      />
    </span>
  );
}

// Lowercase, with the accent of the é drawn in kunyit.
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-heading text-2xl leading-none font-bold tracking-tight",
        INK,
        className,
      )}
    >
      <span className="sr-only">Tarékah</span>
      <span aria-hidden>
        tar
        <AccentE />
        kah
      </span>
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <Logomark className="size-7" />
      <Wordmark className="text-[2.125rem]" />
    </span>
  );
}
