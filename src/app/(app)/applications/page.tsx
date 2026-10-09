import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Lamaran" };

export default function ApplicationsPage({
  searchParams,
}: PageProps<"/applications">) {
  return (
    <div className="flex flex-col gap-2">
      <Suspense
        fallback={
          <h1 className="text-2xl font-semibold tracking-tight">Lamaran</h1>
        }
      >
        <Heading searchParams={searchParams} />
      </Suspense>
      <p className="text-muted-foreground">
        Belum ada lamaran. Daftar dan board lamaran akan muncul di sini.
      </p>
    </div>
  );
}

// searchParams is request-time data, so it is read behind the boundary.
async function Heading({
  searchParams,
}: Pick<PageProps<"/applications">, "searchParams">) {
  const { view } = await searchParams;

  return (
    <h1 className="text-2xl font-semibold tracking-tight">
      {view === "board" ? "Board" : "Lamaran"}
    </h1>
  );
}
