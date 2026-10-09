import { Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState } from "@/components/empty-state";
import { Markdown } from "@/components/markdown";
import { PageHeader } from "@/components/page-header";
import { ListSkeleton } from "@/components/skeletons";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/features/applications/format";
import {
  INTERVIEW_STAGE_LABELS,
  INTERVIEW_STAGE_OPTIONS,
} from "@/features/interviews/labels";
import { getQuestions } from "@/features/interviews/queries";

export const metadata: Metadata = { title: "Pertanyaan interview" };

export default function QuestionsPage({
  searchParams,
}: PageProps<"/questions">) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pertanyaan interview"
        description="Semua pertanyaan dari catatan interview di seluruh lamaran."
      />
      <Suspense fallback={<ListSkeleton />}>
        <Questions searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

// searchParams is request-time data, so it is read behind the boundary.
async function Questions({
  searchParams,
}: Pick<PageProps<"/questions">, "searchParams">) {
  const params = await searchParams;
  const q = first(params.q) ?? "";
  const stage = first(params.stage) ?? "";
  const { total, matches } = await getQuestions({ q, stage });

  if (total === 0) {
    return (
      <EmptyState
        title="Kumpulkan pertanyaan interview-mu"
        description="Tambahkan catatan interview di halaman detail lamaran. Pertanyaan yang kamu tulis di sana terkumpul di sini."
      >
        <Link
          href="/applications"
          className={buttonVariants({ variant: "outline" })}
        >
          Buka lamaran
        </Link>
      </EmptyState>
    );
  }

  return (
    <>
      <form className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            name="q"
            defaultValue={q}
            aria-label="Cari pertanyaan, perusahaan, atau posisi"
            placeholder="Cari pertanyaan, perusahaan, atau posisi…"
            className="pl-8"
          />
        </div>
        <select
          name="stage"
          defaultValue={stage}
          aria-label="Filter tahap"
          className="h-9 rounded-md border border-input bg-card px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        >
          <option value="">Semua tahap</option>
          {INTERVIEW_STAGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline">
          Cari
        </Button>
        {q !== "" || stage !== "" ? (
          <Link
            href="/questions"
            className={buttonVariants({ variant: "ghost" })}
          >
            Reset
          </Link>
        ) : null}
      </form>

      {matches.length === 0 ? (
        <p className="rounded-lg border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
          Tidak ada pertanyaan yang cocok. Ubah kata kunci atau filter.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <ul className="divide-y">
            {matches.map((item) => (
              <li
                key={item.key}
                className="flex flex-col gap-2 px-4 py-4 sm:px-5"
              >
                <Markdown>{item.question}</Markdown>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <Badge variant="secondary">
                    {INTERVIEW_STAGE_LABELS[item.stage]}
                  </Badge>
                  <Link
                    href={`/applications/${item.applicationId}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {item.companyName} · {item.position}
                  </Link>
                  <span className="font-figure">
                    {formatDateTime(item.scheduledAt)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <p
            className="border-t px-4 py-3 text-xs text-muted-foreground sm:px-5"
            aria-live="polite"
          >
            Menampilkan <span className="font-figure">{matches.length}</span>{" "}
            dari <span className="font-figure">{total}</span> pertanyaan
          </p>
        </div>
      )}
    </>
  );
}
