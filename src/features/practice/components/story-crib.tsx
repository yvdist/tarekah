import { Markdown } from "@/components/markdown";
import { STAR_PARTS } from "@/features/stories/labels";
import type { PracticeQuestion } from "../data";

// The stories linked to the question, closed until asked for: a crib to
// glance at, not a script to read from.
export function StoryCrib({
  stories,
}: {
  stories: PracticeQuestion["stories"];
}) {
  if (stories.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Contekan cerita"
      className="flex flex-col gap-2 text-sm"
    >
      <p className="text-xs text-muted-foreground">
        Contekan dari cerita yang tertaut. Buka kalau perlu.
      </p>
      {stories.map((story) => {
        const parts = STAR_PARTS.filter((part) => story[part.name]);

        return (
          <details key={story.id} className="rounded-lg border bg-card">
            <summary className="cursor-pointer rounded-lg px-4 py-3 font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
              {story.title}
            </summary>
            <div className="flex flex-col gap-4 border-t px-4 py-4">
              {parts.length === 0 ? (
                <p className="text-muted-foreground">Cerita ini belum diisi.</p>
              ) : (
                parts.map((part) => (
                  <div key={part.name} className="flex flex-col gap-1">
                    <h3 className="text-xs text-muted-foreground">
                      {part.label}
                    </h3>
                    <Markdown>{story[part.name] ?? ""}</Markdown>
                  </div>
                ))
              )}
            </div>
          </details>
        );
      })}
    </section>
  );
}
