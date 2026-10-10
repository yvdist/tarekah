import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { DetailSkeleton } from "@/components/skeletons";
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
        <Session params={params} />
      </Suspense>
    </div>
  );
}

// params is request-time data, so it is read behind the boundary.
async function Session({
  params,
}: Pick<PageProps<"/practice/simulation/[sessionId]">, "params">) {
  const { sessionId } = await params;
  const session = await getSimulation(sessionId);
  const settings = [
    INTERVIEW_TYPE_LABELS[session.interviewType],
    PRACTICE_LEVEL_LABELS[session.level],
    PRACTICE_LANGUAGE_LABELS[session.language],
    `Nada ${PRACTICE_TONE_LABELS[session.tone].toLowerCase()}`,
    ...(session.duration ? [`${session.duration} menit`] : []),
  ];

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
      <Simulation key={session.id} session={session} />
    </>
  );
}
