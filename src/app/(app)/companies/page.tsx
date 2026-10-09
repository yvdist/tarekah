import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
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
      <h1 className="text-2xl font-semibold tracking-tight">Perusahaan</h1>
      <Suspense fallback={<p className="text-muted-foreground">Memuat…</p>}>
        <Companies />
      </Suspense>
    </div>
  );
}

async function Companies() {
  const companies = await getCompanies();

  if (companies.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-16 text-center">
        <h2 className="text-lg font-medium">Belum ada perusahaan</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Perusahaan tercatat otomatis saat kamu menambah lamaran.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
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
              <TableCell className="text-right tabular-nums">
                {company.applicationCount}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
