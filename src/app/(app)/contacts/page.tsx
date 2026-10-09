import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ListSkeleton } from "@/components/skeletons";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getApplicationOptions } from "@/features/applications/queries";
import { getCompanyOptions } from "@/features/companies/queries";
import {
  AddContactButton,
  ContactRowActions,
} from "@/features/contacts/components/contact-actions";
import { CONTACT_ROLE_LABELS } from "@/features/contacts/labels";
import { getContacts } from "@/features/contacts/queries";

export const metadata: Metadata = { title: "Kontak" };

export default function ContactsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Kontak"
        description="Orang yang kamu temui di sepanjang jalan, dan lamaran yang mereka bantu."
        actions={
          <Suspense fallback={<Skeleton className="h-10 w-40" />}>
            <AddContact />
          </Suspense>
        }
      />
      <Suspense fallback={<ListSkeleton />}>
        <Contacts />
      </Suspense>
    </div>
  );
}

// The form lists the user's companies and applications, so the button waits
// for them too.
async function getFormOptions() {
  const [companies, applications] = await Promise.all([
    getCompanyOptions(),
    getApplicationOptions(),
  ]);

  return { companies, applications };
}

async function AddContact() {
  return <AddContactButton options={await getFormOptions()} size="lg" />;
}

async function Contacts() {
  const [contacts, options] = await Promise.all([
    getContacts(),
    getFormOptions(),
  ]);

  if (contacts.length === 0) {
    return (
      <EmptyState
        title="Catat siapa yang kamu temui"
        description="Catat recruiter, pemberi referral, atau hiring manager, lalu hubungkan ke lamaran terkait."
      >
        <AddContactButton options={options} variant="outline" />
      </EmptyState>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <ul className="divide-y">
        {contacts.map((contact) => (
          <li
            key={contact.id}
            className="flex items-start justify-between gap-3 px-4 py-4 sm:px-5"
          >
            <div className="flex min-w-0 flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium break-words">{contact.name}</span>
                <Badge variant="secondary">
                  {CONTACT_ROLE_LABELS[contact.role]}
                </Badge>
                {contact.companyId && contact.companyName ? (
                  <Link
                    href={`/companies/${contact.companyId}`}
                    className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                  >
                    {contact.companyName}
                  </Link>
                ) : null}
              </div>
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
              {contact.notes ? (
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                  {contact.notes}
                </p>
              ) : null}
              {contact.applications.length > 0 ? (
                <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {contact.applications.map((application) => (
                    <li key={application.id}>
                      <Link
                        href={`/applications/${application.id}`}
                        className="underline underline-offset-4"
                      >
                        {application.companyName} · {application.position}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <ContactRowActions contact={contact} options={options} />
          </li>
        ))}
      </ul>
    </div>
  );
}
