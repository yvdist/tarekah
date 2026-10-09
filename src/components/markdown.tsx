import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

// Simple markdown for user-written notes. Raw HTML is never rendered, and
// anything outside this list is unwrapped to its text.
const ALLOWED_ELEMENTS = [
  "p",
  "strong",
  "em",
  "code",
  "ul",
  "ol",
  "li",
  "a",
  "br",
];

export function Markdown({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 text-sm break-words [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_li>p]:inline [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5",
        className,
      )}
    >
      <ReactMarkdown
        allowedElements={ALLOWED_ELEMENTS}
        unwrapDisallowed
        components={{
          a: ({ href, children: label }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              {label}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
