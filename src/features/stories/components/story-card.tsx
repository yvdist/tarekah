import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { COMPETENCY_LABELS } from "../labels";
import type { StoryListItem } from "../queries";

// One story in the list: title, competencies, the first line of the
// situation and how many questions it answers.
export function StoryCard({ story }: { story: StoryListItem }) {
  const preview = story.situation ?? story.task ?? story.action ?? null;

  return (
    <li>
      <Link
        href={`/stories/${story.id}`}
        className="flex h-full flex-col gap-3 rounded-lg border bg-card p-5 transition-shadow hover:shadow-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <h2 className="font-medium text-balance">{story.title}</h2>
        {preview ? (
          <p className="line-clamp-2 text-sm text-pretty text-muted-foreground">
            {preview}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Masih judul saja. Lengkapi saat ada waktu.
          </p>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-1.5">
          {story.competencies.map((competency) => (
            <Badge key={competency} variant="secondary">
              {COMPETENCY_LABELS[competency]}
            </Badge>
          ))}
          <span className="ml-auto text-xs text-muted-foreground">
            <span className="font-figure">{story.questionCount}</span>{" "}
            pertanyaan
          </span>
        </div>
      </Link>
    </li>
  );
}
