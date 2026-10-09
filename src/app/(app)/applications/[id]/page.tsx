import { ArrowLeft, ExternalLink, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { buttonVariants } from "@/components/ui/button";
import { DeleteApplicationButton } from "@/features/applications/components/delete-application-dialog";
import { FollowUpActions } from "@/features/applications/components/follow-up-actions";
import { FollowUpBadge } from "@/features/applications/components/follow-up-badge";
import { StatusSelect } from "@/features/applications/components/status-select";
import { StatusTimeline } from "@/features/applications/components/status-timeline";
import { isFollowUpStatus } from "@/features/applications/follow-up";
import {
  formatDate,
  formatDateTime,
  formatSalary,
} from "@/features/applications/format";
import {
  SOURCE_LABELS,
  WORK_TYPE_LABELS,
} from "@/features/applications/labels";
import { getApplication } from "@/features/applications/queries";
import { ApplicationContacts } from "@/features/contacts/components/application-contacts";
import { getContactsForApplication } from "@/features/contacts/queries";
import { AddInterviewButton } from "@/features/interviews/components/interview-actions";
import { InterviewList } from "@/features/interviews/components/interview-list";
import { getInterviews } from "@/features/interviews/queries";

export const metadata: Metadata = { title: "Detail lamaran" };

export default function ApplicationPage({
  params,
}: PageProps<"/applications/[id]">) {
  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/applications"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Semua lamaran
      </Link>
      <Suspense
        fallback={<p className="text-muted-foreground">Memuat lamaran…</p>}
      >
        <ApplicationDetails params={params} />
      </Suspense>
    </div>
  );
}

// params is request-time data, so it is read behind the boundary.
async function ApplicationDetails({
  params,
}: Pick<PageProps<"/applications/[id]">, "params">) {
  const { id } = await params;
  const application = await getApplication(id);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {application.position}
          </h1>
          <p className="text-muted-foreground">{application.companyName}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/applications/${application.id}/edit`}
            className={buttonVariants({ variant: "outline" })}
          >
            <Pencil />
            Edit
          </Link>
          <DeleteApplicationButton
            applicationId={application.id}
            label={`${application.position} di ${application.companyName}`}
          />
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-3">
            <h2 className="font-medium">Informasi</h2>
            <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
              <Item label="Status">
                <StatusSelect
                  applicationId={application.id}
                  status={application.status}
                />
              </Item>
              <Item label="Tanggal apply">
                {formatDate(application.appliedAt)}
              </Item>
              <Item label="Sumber">
                {SOURCE_LABELS[application.source]}
                {application.sourceDetail
                  ? ` (${application.sourceDetail})`
                  : null}
              </Item>
              <Item label="Tipe kerja">
                {application.workType
                  ? WORK_TYPE_LABELS[application.workType]
                  : "—"}
              </Item>
              <Item label="Lokasi">{application.location ?? "—"}</Item>
              <Item label="Gaji">
                {formatSalary(
                  application.salaryMin,
                  application.salaryMax,
                  application.salaryCurrency,
                )}
              </Item>
              <Item label="Link lowongan">
                {application.jobUrl ? (
                  <a
                    href={application.jobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 break-all underline underline-offset-4"
                  >
                    Buka lowongan
                    <ExternalLink className="size-3.5 shrink-0" />
                  </a>
                ) : (
                  "—"
                )}
              </Item>
              <Item label="CV">
                <DocumentLink document={application.cvDocument} />
              </Item>
              <Item label="Cover letter">
                <DocumentLink document={application.coverLetterDocument} />
              </Item>
              <Item label="Follow-up terakhir">
                <div className="flex flex-col items-start gap-2">
                  <span>
                    {application.lastFollowedUpAt
                      ? formatDateTime(application.lastFollowedUpAt)
                      : "—"}
                  </span>
                  <FollowUpBadge followUp={application.followUp} />
                  {isFollowUpStatus(application.status) ? (
                    <FollowUpActions
                      applicationId={application.id}
                      suggestGhosted={application.followUp.suggestGhosted}
                    />
                  ) : null}
                </div>
              </Item>
              <Item label="Terakhir diperbarui">
                {formatDateTime(application.updatedAt)}
              </Item>
            </dl>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-medium">Catatan</h2>
            {application.notes ? (
              <p className="text-sm whitespace-pre-wrap">{application.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Belum ada catatan. Tambahkan lewat tombol Edit.
              </p>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-medium">Interview</h2>
              <AddInterviewButton applicationId={application.id} />
            </div>
            <Suspense
              fallback={
                <p className="text-sm text-muted-foreground">Memuat…</p>
              }
            >
              <Interviews applicationId={application.id} />
            </Suspense>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-medium">Kontak</h2>
            <Suspense
              fallback={
                <p className="text-sm text-muted-foreground">Memuat…</p>
              }
            >
              <Contacts applicationId={application.id} />
            </Suspense>
          </section>
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="font-medium">Riwayat status</h2>
          <StatusTimeline events={application.statusEvents} />
        </section>
      </div>
    </>
  );
}

async function Interviews({ applicationId }: { applicationId: string }) {
  return <InterviewList interviews={await getInterviews(applicationId)} />;
}

async function Contacts({ applicationId }: { applicationId: string }) {
  const { linked, available } = await getContactsForApplication(applicationId);

  return (
    <ApplicationContacts
      applicationId={applicationId}
      linked={linked}
      available={available}
    />
  );
}

function DocumentLink({
  document,
}: {
  document: { label: string; url: string | null } | null;
}) {
  if (!document) {
    return "—";
  }

  return document.url ? (
    <a
      href={document.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 break-all underline underline-offset-4"
    >
      {document.label}
      <ExternalLink className="size-3.5 shrink-0" />
    </a>
  ) : (
    document.label
  );
}

function Item({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
