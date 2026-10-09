import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FollowUpActions } from "@/features/applications/components/follow-up-actions";
import { FollowUpBadge } from "@/features/applications/components/follow-up-badge";
import { StatusBadge } from "@/features/applications/components/status-badge";
import { formatDateTime } from "@/features/applications/format";
import { getFollowUpItems } from "@/features/applications/queries";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Perlu Follow-up</h2>
        <Suspense fallback={<p className="text-muted-foreground">Memuat…</p>}>
          <FollowUpPanel />
        </Suspense>
      </section>
    </div>
  );
}

async function FollowUpPanel() {
  const items = await getFollowUpItems();

  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
        Tidak ada lamaran yang perlu ditindaklanjuti.
      </p>
    );
  }

  return (
    <ul className="divide-y rounded-lg border">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex flex-wrap items-center justify-between gap-3 p-4"
        >
          <div className="flex min-w-0 flex-col gap-1.5">
            <Link
              href={`/applications/${item.id}`}
              className="font-medium break-words underline-offset-4 hover:underline"
            >
              {item.companyName}
              <span className="font-normal text-muted-foreground">
                {" · "}
                {item.position}
              </span>
            </Link>
            <div className="flex flex-wrap items-center gap-1">
              <StatusBadge status={item.status} />
              <FollowUpBadge followUp={item.followUp} />
            </div>
            <p className="text-xs text-muted-foreground">
              Follow-up terakhir:{" "}
              {item.lastFollowedUpAt
                ? formatDateTime(item.lastFollowedUpAt)
                : "belum pernah"}
            </p>
          </div>
          <FollowUpActions
            applicationId={item.id}
            suggestGhosted={item.followUp.suggestGhosted}
          />
        </li>
      ))}
    </ul>
  );
}
