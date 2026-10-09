import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { buttonVariants } from "@/components/ui/button";
import { ApplicationsTable } from "@/features/applications/components/applications-table";
import { getApplications } from "@/features/applications/queries";

export const metadata: Metadata = { title: "Lamaran" };

export default function ApplicationsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Lamaran</h1>
        <Link href="/applications/new" className={buttonVariants()}>
          <Plus />
          Tambah lamaran
        </Link>
      </div>
      <Suspense
        fallback={<p className="text-muted-foreground">Memuat lamaran…</p>}
      >
        <Applications />
      </Suspense>
    </div>
  );
}

async function Applications() {
  const applications = await getApplications();

  return <ApplicationsTable data={applications} />;
}
