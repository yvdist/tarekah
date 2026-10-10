import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { FormSkeleton } from "@/components/skeletons";
import { getAiStatus } from "@/features/ai/queries";
import { Drill } from "@/features/practice/components/drill";
import { StoryCrib } from "@/features/practice/components/story-crib";
import {
  getPracticeQuestion,
  getPracticeQuestions,
} from "@/features/practice/queries";
import { QUESTION_CATEGORY_LABELS } from "@/features/questions/labels";
import { getStoryOptions } from "@/features/stories/queries";

export const metadata: Metadata = { title: "Latihan singkat" };

// Asking for feedback calls the provider from a Server Action of this page.
// The call itself gives up sooner (src/features/practice/feedback.ts).
export const maxDuration = 60;

export default function DrillPage({
  params,
}: PageProps<"/practice/drill/[questionId]">) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Link
        href="/practice"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Semua latihan
      </Link>
      <PageHeader
        title="Latihan singkat"
        description="Jawab dengan kata-katamu sendiri. Jawabanmu tersimpan, dengan atau tanpa masukan."
      />
      <Suspense fallback={<FormSkeleton fields={2} />}>
        <DrillContent params={params} />
      </Suspense>
    </div>
  );
}

// params is request-time data, so it is read behind the boundary.
async function DrillContent({
  params,
}: Pick<PageProps<"/practice/drill/[questionId]">, "params">) {
  const { questionId } = await params;
  const [question, ai, storyOptions, { matches }] = await Promise.all([
    getPracticeQuestion(questionId),
    getAiStatus(),
    getStoryOptions(),
    getPracticeQuestions(),
  ]);
  // The next question is another question, not another row asking this one.
  const others = matches.filter((item) => !item.ids.includes(question.id));

  return (
    <div className="flex flex-col gap-4">
      <Panel
        title="Pertanyaan"
        hint={QUESTION_CATEGORY_LABELS[question.category]}
      >
        <p className="font-heading text-xl leading-snug text-pretty break-words">
          {question.text}
        </p>
      </Panel>
      <StoryCrib stories={question.stories} />
      {/* Keyed so the next question starts from an empty answer. */}
      <Drill
        key={question.id}
        question={question}
        aiReady={ai.ready}
        storyOptions={storyOptions}
        questions={others.map(({ id, readiness }) => ({ id, readiness }))}
      />
    </div>
  );
}
