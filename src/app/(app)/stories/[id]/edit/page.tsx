import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { FormSkeleton } from "@/components/skeletons";
import { StoryForm } from "@/features/stories/components/story-form";
import { getStory } from "@/features/stories/queries";

export const metadata: Metadata = { title: "Edit cerita" };

export default function EditStoryPage({
  params,
}: PageProps<"/stories/[id]/edit">) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader title="Edit cerita" />
      <Suspense fallback={<FormSkeleton />}>
        <EditStoryForm params={params} />
      </Suspense>
    </div>
  );
}

// params is request-time data, so it is read behind the boundary.
async function EditStoryForm({
  params,
}: Pick<PageProps<"/stories/[id]/edit">, "params">) {
  const { id } = await params;
  const story = await getStory(id);

  return (
    <StoryForm
      storyId={story.id}
      defaultValues={{
        title: story.title,
        situation: story.situation ?? "",
        task: story.task ?? "",
        action: story.action ?? "",
        result: story.result ?? "",
        competencies: story.competencies,
      }}
    />
  );
}
