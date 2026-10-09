import { Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Markdown } from "@/components/markdown";
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
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Pertanyaan interview
        </h1>
        <p className="text-sm text-muted-foreground">
          Semua pertanyaan dari catatan interview di seluruh lamaran.
        </p>
      </div>
      <Suspense fallback={<p className="text-muted-foreground">Memuat…</p>}>
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
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-16 text-center">
        <h2 className="text-lg font-medium">Belum ada pertanyaan</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Tambahkan catatan interview di halaman detail lamaran. Pertanyaan yang
          kamu tulis di sana terkumpul di sini.
        </p>
      </div>
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
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">Semua tahap</option>
          {INTERVIEW_STAGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Button type="submit">Cari</Button>
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
        <ul className="divide-y rounded-lg border">
          {matches.map((item) => (
            <li key={item.key} className="flex flex-col gap-2 p-4">
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
                <span>{formatDateTime(item.scheduledAt)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-sm text-muted-foreground" aria-live="polite">
        Menampilkan {matches.length} dari {total} pertanyaan
      </p>
    </>
  );
}
