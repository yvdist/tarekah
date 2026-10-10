import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { FormSkeleton } from "@/components/skeletons";
import { AiInvite } from "@/features/practice/components/ai-invite";
import { SimulationSettingsForm } from "@/features/practice/components/simulation-settings-form";
import { getSimulationSetup } from "@/features/practice/queries";

export const metadata: Metadata = { title: "Simulasi interview" };

export default function NewSimulationPage({
  searchParams,
}: PageProps<"/practice/simulation/new">) {
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
        title="Simulasi interview"
        description="AI menjadi interviewer: satu pertanyaan tiap giliran, dan catatan baru muncul setelah sesi selesai."
      />
      <Panel title="Pengaturan sesi">
        <Suspense fallback={<FormSkeleton fields={6} bare />}>
          <Setup searchParams={searchParams} />
        </Suspense>
      </Panel>
    </div>
  );
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

// searchParams is request-time data, so it is read behind the boundary.
async function Setup({
  searchParams,
}: Pick<PageProps<"/practice/simulation/new">, "searchParams">) {
  const { application } = await searchParams;
  const { aiReady, applications, defaults } = await getSimulationSetup(
    first(application),
  );

  // A simulation is a conversation with a model: without a key there is
  // nothing to set up yet.
  if (!aiReady) {
    return <AiInvite simulation />;
  }

  return (
    <SimulationSettingsForm
      // A link from another application starts the form over.
      key={defaults.applicationId}
      defaults={defaults}
      applications={applications}
    />
  );
}
