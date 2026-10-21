import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { DetailSkeleton } from "@/components/skeletons";
import { getAiStatus } from "@/features/ai/queries";
import { Simulation } from "@/features/practice/components/simulation";
import {
  INTERVIEW_TYPE_LABELS,
  PRACTICE_LANGUAGE_LABELS,
  PRACTICE_LEVEL_LABELS,
  PRACTICE_TONE_LABELS,
  SESSION_STATUS_LABELS,
} from "@/features/practice/labels";
import { getSimulation } from "@/features/practice/queries";

export const metadata: Metadata = { title: "Simulasi interview" };

// The interviewer's turns and the summary call the provider from Server
// Actions of this page. The calls themselves give up sooner
// (src/features/practice/interviewer.ts and summary.ts).
export const maxDuration = 120;

export default function SimulationPage({
  params,
  searchParams,
}: PageProps<"/practice/simulation/[sessionId]">) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Link
        href="/practice"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Semua latihan
      </Link>
      <Suspense fallback={<DetailSkeleton />}>
        <Session params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

// params and searchParams are request-time data, so they are read behind the
// boundary.
async function Session({
  params,
  searchParams,
}: Pick<
  PageProps<"/practice/simulation/[sessionId]">,
  "params" | "searchParams"
>) {
  const [{ sessionId }, { summary: summaryParam }] = await Promise.all([
    params,
    searchParams,
  ]);
  const [session, ai] = await Promise.all([
    getSimulation(sessionId),
    getAiStatus(),
  ]);
  const settings = [
    INTERVIEW_TYPE_LABELS[session.interviewType],
    PRACTICE_LEVEL_LABELS[session.level],
    PRACTICE_LANGUAGE_LABELS[session.language],
    `Nada ${PRACTICE_TONE_LABELS[session.tone].toLowerCase()}`,
    ...(session.duration ? [`${session.duration} menit`] : []),
  ];
  // The history says whether this session has its summary. This page reads
  // the database itself, and a summary written a moment ago can still be in a
  // short-lived cache, so the link's word is taken as a floor: it can make the
  // page ask for the summary, never claim one that is not there.
  const summaryReady = first(summaryParam) === "ready";

  return (
    <>
      <PageHeader
        title="Simulasi interview"
        description={
          <>
            {settings.join(" · ")}
            {session.application ? (
              <>
                {" · untuk "}
                <Link
                  href={`/applications/${session.application.id}`}
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  {session.application.position} di{" "}
                  {session.application.companyName}
                </Link>
              </>
            ) : null}
            {session.status === "in_progress"
              ? null
              : ` · ${SESSION_STATUS_LABELS[session.status]}`}
          </>
        }
      />
      <Simulation
        key={session.id}
        session={session}
        transcriptionProvider={ai.transcriptionProvider}
        summaryReady={summaryReady}
      />
    </>
  );
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
