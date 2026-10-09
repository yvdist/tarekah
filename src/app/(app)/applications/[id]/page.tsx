import { ArrowLeft, ExternalLink, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { DetailSkeleton, TextSkeleton } from "@/components/skeletons";
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
      <Suspense fallback={<DetailSkeleton />}>
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
      <PageHeader
        title={application.position}
        description={
          <Link
            href={`/companies/${application.companyId}`}
            className="underline-offset-4 hover:underline"
          >
            {application.companyName}
          </Link>
        }
        actions={
          <>
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
          </>
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="flex min-w-0 flex-col gap-4">
          <Panel title="Informasi">
            <dl className="grid gap-x-6 gap-y-5 text-sm sm:grid-cols-2">
              <Item label="Status">
                <StatusSelect
                  applicationId={application.id}
                  status={application.status}
                />
              </Item>
              <Item label="Tanggal apply">
                <span className="font-figure">
                  {formatDate(application.appliedAt)}
                </span>
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
          </Panel>

          <Panel title="Catatan">
            {application.notes ? (
              <p className="text-sm whitespace-pre-wrap">{application.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Belum ada catatan. Tambahkan lewat tombol Edit.
              </p>
            )}
          </Panel>

          <Panel
            title="Interview"
            action={<AddInterviewButton applicationId={application.id} />}
          >
            <Suspense fallback={<TextSkeleton />}>
              <Interviews applicationId={application.id} />
            </Suspense>
          </Panel>

          <Panel title="Kontak">
            <Suspense fallback={<TextSkeleton />}>
              <Contacts applicationId={application.id} />
            </Suspense>
          </Panel>
        </div>

        {/* Not a Panel: board.spec.ts reaches the list through the heading's
            parent, so the heading stays a direct child of the section. */}
        <section className="flex flex-col gap-5 rounded-lg border bg-card p-5 sm:p-6">
          <h2 className="text-[0.9375rem] font-medium">Riwayat status</h2>
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
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
