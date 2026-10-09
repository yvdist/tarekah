import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ListSkeleton } from "@/components/skeletons";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCompanies } from "@/features/companies/queries";

export const metadata: Metadata = { title: "Perusahaan" };

export default function CompaniesPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Perusahaan"
        description="Tercatat otomatis saat kamu menambah lamaran."
      />
      <Suspense fallback={<ListSkeleton />}>
        <Companies />
      </Suspense>
    </div>
  );
}

async function Companies() {
  const companies = await getCompanies();

  if (companies.length === 0) {
    return (
      <EmptyState
        title="Ke mana léngkah pertamamu?"
        description="Perusahaan muncul di sini begitu kamu mencatat lamaran ke sana."
      >
        <Link
          href="/applications/new"
          className={buttonVariants({ variant: "outline" })}
        >
          Catat lamaran
        </Link>
      </EmptyState>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nama</TableHead>
            <TableHead>Website</TableHead>
            <TableHead className="text-right">Lamaran</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.map((company) => (
            <TableRow key={company.id}>
              <TableCell>
                <Link
                  href={`/companies/${company.id}`}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {company.name}
                </Link>
              </TableCell>
              <TableCell>
                {company.website ? (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-muted-foreground underline-offset-4 hover:underline"
                  >
                    {company.website}
                  </a>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-right font-figure">
                {company.applicationCount}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
