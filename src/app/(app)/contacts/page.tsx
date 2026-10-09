import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
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
      <h1 className="text-2xl font-semibold tracking-tight">Kontak</h1>
      <Suspense fallback={<p className="text-muted-foreground">Memuat…</p>}>
        <Contacts />
      </Suspense>
    </div>
  );
}

async function Contacts() {
  const [contacts, companies, applications] = await Promise.all([
    getContacts(),
    getCompanyOptions(),
    getApplicationOptions(),
  ]);
  const options = { companies, applications };

  return (
    <>
      <div className="flex justify-end">
        <AddContactButton options={options} />
      </div>
      {contacts.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-16 text-center">
          <h2 className="text-lg font-medium">Belum ada kontak</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Catat recruiter, pemberi referral, atau hiring manager, lalu
            hubungkan ke lamaran terkait.
          </p>
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {contacts.map((contact) => (
            <li
              key={contact.id}
              className="flex flex-wrap items-start justify-between gap-3 p-4"
            >
              <div className="flex min-w-0 flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium break-words">
                    {contact.name}
                  </span>
                  <Badge variant="secondary">
                    {CONTACT_ROLE_LABELS[contact.role]}
                  </Badge>
                  {contact.companyName ? (
                    <span className="text-sm text-muted-foreground">
                      {contact.companyName}
                    </span>
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
                      className="underline underline-offset-4"
                    >
                      LinkedIn
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
      )}
    </>
  );
}
