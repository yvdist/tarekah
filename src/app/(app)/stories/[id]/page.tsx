import { ArrowLeft, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Markdown } from "@/components/markdown";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { DetailSkeleton } from "@/components/skeletons";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  QUESTION_CATEGORY_LABELS,
  QUESTION_READINESS_LABELS,
} from "@/features/questions/labels";
import { DeleteStoryButton } from "@/features/stories/components/delete-story-button";
import { COMPETENCY_LABELS, STAR_PARTS } from "@/features/stories/labels";
import { getStory } from "@/features/stories/queries";

export const metadata: Metadata = { title: "Detail cerita" };

export default function StoryPage({ params }: PageProps<"/stories/[id]">) {
  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/stories"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Semua cerita
      </Link>
      <Suspense fallback={<DetailSkeleton />}>
        <StoryDetails params={params} />
      </Suspense>
    </div>
  );
}

// params is request-time data, so it is read behind the boundary.
async function StoryDetails({
  params,
}: Pick<PageProps<"/stories/[id]">, "params">) {
  const { id } = await params;
  const story = await getStory(id);

  return (
    <>
      <PageHeader
        title={story.title}
        description={
          story.competencies.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {story.competencies.map((competency) => (
                <Badge key={competency} variant="secondary">
                  {COMPETENCY_LABELS[competency]}
                </Badge>
              ))}
            </div>
          ) : (
            "Belum ada kompetensi yang ditandai."
          )
        }
        actions={
          <>
            <Link
              href={`/stories/${story.id}/edit`}
              className={buttonVariants({ variant: "outline" })}
            >
              <Pencil />
              Edit
            </Link>
            <DeleteStoryButton storyId={story.id} title={story.title} />
          </>
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="flex min-w-0 flex-col gap-4">
          {STAR_PARTS.map((part) => (
            <Panel key={part.name} title={part.label} hint={part.hint}>
              {story[part.name] ? (
                <Markdown>{story[part.name] ?? ""}</Markdown>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Belum diisi. Tambahkan lewat tombol Edit.
                </p>
              )}
            </Panel>
          ))}
        </div>

        <Panel
          title="Pertanyaan terhubung"
          hint={
            <Link
              href="/questions"
              className="underline-offset-4 hover:underline"
            >
              Tautkan di halaman Pertanyaan
            </Link>
          }
        >
          {story.questions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada pertanyaan yang memakai cerita ini.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {story.questions.map((question) => (
                <li key={question.id} className="flex flex-col gap-1 text-sm">
                  <span>{question.text}</span>
                  <span className="text-xs text-muted-foreground">
                    {QUESTION_CATEGORY_LABELS[question.category]} ·{" "}
                    {QUESTION_READINESS_LABELS[question.readiness]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
