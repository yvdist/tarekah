import { Download, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { ListSkeleton } from "@/components/skeletons";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApplicationsTable } from "@/features/applications/components/applications-table";
import {
  parseListView,
  serializeListView,
} from "@/features/applications/list-view";
import { getApplications } from "@/features/applications/queries";

export const metadata: Metadata = { title: "Lamaran" };

export default function ApplicationsPage({
  searchParams,
}: PageProps<"/applications">) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Lamaran"
        description={
          <Suspense fallback={<Skeleton className="h-5 w-56" />}>
            <ApplicationsSummary />
          </Suspense>
        }
        actions={
          <>
            {/* A plain anchor: this is a file download, not a page to prefetch. */}
            <a
              href="/applications/export"
              download
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              <Download />
              Export CSV
            </a>
            <Link
              href="/applications/new"
              className={buttonVariants({ size: "lg" })}
            >
              <Plus />
              Tambah lamaran
            </Link>
          </>
        }
      />
      <Suspense fallback={<ListSkeleton />}>
        <Applications searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ApplicationsSummary() {
  const applications = await getApplications();

  if (applications.length === 0) {
    return <p>Belum ada lamaran yang dicatat.</p>;
  }

  const wishlist = applications.filter(
    (application) => application.status === "wishlist",
  ).length;

  return (
    <p>
      {applications.length} catatan · {applications.length - wishlist} terkirim
      {wishlist > 0 ? `, ${wishlist} di wishlist` : null}
    </p>
  );
}

// searchParams is request-time data, so it is read behind the boundary.
async function Applications({
  searchParams,
}: Pick<PageProps<"/applications">, "searchParams">) {
  const [applications, params] = await Promise.all([
    getApplications(),
    searchParams,
  ]);
  const view = parseListView(params);

  // The table writes its view to the address without navigating, so this only
  // renders again, and the key only changes, when a link leads here.
  return (
    <ApplicationsTable
      key={serializeListView(view)}
      data={applications}
      initialView={view}
    />
  );
}
