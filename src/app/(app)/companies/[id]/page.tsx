import { ArrowLeft, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { DetailSkeleton } from "@/components/skeletons";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/features/applications/components/status-badge";
import { formatDate } from "@/features/applications/format";
import { getCompany } from "@/features/companies/queries";
import { CONTACT_ROLE_LABELS } from "@/features/contacts/labels";

export const metadata: Metadata = { title: "Detail perusahaan" };

export default function CompanyPage({ params }: PageProps<"/companies/[id]">) {
  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/companies"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Semua perusahaan
      </Link>
      <Suspense fallback={<DetailSkeleton />}>
        <CompanyDetails params={params} />
      </Suspense>
    </div>
  );
}

// params is request-time data, so it is read behind the boundary.
async function CompanyDetails({
  params,
}: Pick<PageProps<"/companies/[id]">, "params">) {
  const { id } = await params;
  const company = await getCompany(id);

  return (
    <>
      <PageHeader
        title={company.name}
        description={
          company.website ? (
            <a
              href={company.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 break-all underline underline-offset-4"
            >
              {company.website}
              <ExternalLink className="size-3.5 shrink-0" />
            </a>
          ) : null
        }
      />

      {company.notes ? (
        <Panel title="Catatan">
          <p className="text-sm whitespace-pre-wrap">{company.notes}</p>
        </Panel>
      ) : null}

      <Panel title="Lamaran">
        {company.applications.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Belum ada lamaran ke perusahaan ini.
          </p>
        ) : (
          <ul className="-my-4 divide-y">
            {company.applications.map((application) => (
              <li
                key={application.id}
                className="flex flex-wrap items-center justify-between gap-3 py-4"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <Link
                    href={`/applications/${application.id}`}
                    className="font-medium break-words underline-offset-4 hover:underline"
                  >
                    {application.position}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    Tanggal apply:{" "}
                    <span className="font-figure">
                      {formatDate(application.appliedAt)}
                    </span>
                  </p>
                </div>
                <StatusBadge status={application.status} />
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Kontak">
        {company.contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Belum ada kontak di perusahaan ini. Tambahkan lewat halaman Kontak.
          </p>
        ) : (
          <ul className="-my-4 divide-y">
            {company.contacts.map((contact) => (
              <li key={contact.id} className="flex flex-col gap-1.5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{contact.name}</span>
                  <Badge variant="secondary">
                    {CONTACT_ROLE_LABELS[contact.role]}
                  </Badge>
                </div>
                {contact.title ? (
                  <p className="text-sm text-muted-foreground">
                    {contact.title}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {contact.email ? (
                    <a
                      href={`mailto:${contact.email}`}
                      className="break-all underline underline-offset-4"
                    >
                      {contact.email}
                    </a>
                  ) : null}
                  {contact.linkedinUrl ? (
                    <a
                      href={contact.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 underline underline-offset-4"
                    >
                      LinkedIn
                      <ExternalLink className="size-3.5 shrink-0" />
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
