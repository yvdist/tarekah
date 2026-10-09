import { cn } from "@/lib/utils";

// The "t" is Fraunces (SOFT 100, weight 600) as an outline, so the mark looks
// the same before the web font loads and in the favicon. src/app/icon.svg
// repeats these shapes; change both together.
const T_PATH =
  "M97.8-785.2 60-793.3Q37.8-802.5 28.2-818.1 18.5-833.7 18.5-855.7 18.5-881.7 36.9-898.6 55.4-915.6 85-915.6H128.6Q149.1-915.6 165.1-928 181.2-940.4 199.3-972.4L257.2-1087.2Q276.1-1116.7 300.4-1134 324.6-1151.4 348.5-1151.4 377.1-1151.4 394.8-1133.6 412.4-1115.8 412.4-1081.4V-296.5Q412.4-236.4 437.5-204.9 462.7-173.5 509.8-173.5 537.9-173.5 558.1-183.8 578.3-194.1 593.5-207.8 608.6-221.6 621.7-231.7 634.8-241.8 647.8-241.2 663-240.8 672.4-227.9 681.8-214.9 680.5-188.9 679.4-135.4 643.3-87.4 607.3-39.3 546.7-9.5 486.1 20.4 411.5 20.4 284.3 20.4 214.9-44.6 145.6-109.6 145.6-245V-708.5Q145.6-743.3 134.9-759.8 124.2-776.3 97.8-785.2ZM304.6-778.1V-915.6H619.1Q650.3-915.6 667-902.3 683.6-889.1 683.6-863.4 683.6-826.7 652-802.4 620.4-778.1 548.5-778.1Z";

// The mark keeps its nila in both themes, like an app icon.
export function Logomark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden
      className={cn("size-8 shrink-0", className)}
    >
      <rect width="64" height="64" rx="19.2" fill="#4a43b0" />
      <path d={T_PATH} transform="translate(21 44) scale(0.027)" fill="#fff" />
      <path
        d="M39.5 54.5h11a3.1 3.1 0 0 0 .5-6.2 4.3 4.3 0 0 0-8.1-1.3 3.8 3.8 0 0 0-3.4 7.5Z"
        fill="none"
        stroke="#c9c5f5"
        strokeWidth="1.3"
        strokeLinejoin="round"
        opacity="0.75"
      />
    </svg>
  );
}

// Lowercase, with the accent of the é drawn in kunyit.
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-heading text-2xl leading-none font-semibold tracking-tight text-foreground",
        className,
      )}
    >
      <span className="sr-only">Tarékah</span>
      <span aria-hidden>
        tar
        <span className="relative inline-block">
          e
          <span className="absolute top-[0.05em] left-[0.35em] h-[0.26em] w-[0.085em] rotate-[38deg] rounded-full bg-kunyit" />
        </span>
        kah
      </span>
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Logomark />
      <Wordmark />
    </span>
  );
}
