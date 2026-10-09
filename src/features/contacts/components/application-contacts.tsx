"use client";

import { Link2, Unlink } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { OptionSelect } from "@/components/option-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { linkContact, unlinkContact } from "../actions";
import { CONTACT_ROLE_LABELS } from "../labels";
import type { ContactListItem } from "../queries";

// Contacts of one application, with controls to link and unlink existing
// contacts. Contacts themselves are created and edited on /contacts.
export function ApplicationContacts({
  applicationId,
  linked,
  available,
}: {
  applicationId: string;
  linked: ContactListItem[];
  available: ContactListItem[];
}) {
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState("");
  // The selection may point at a contact that has just been linked.
  const selectedId = available.some((contact) => contact.id === selected)
    ? selected
    : (available[0]?.id ?? "");

  function run(
    action: () => ReturnType<typeof linkContact>,
    successMessage: string,
  ) {
    startTransition(async () => {
      try {
        const result = await action();

        if (result.ok) {
          toast.success(successMessage);
        } else {
          toast.error(result.message);
        }
      } catch {
        toast.error("Kontak gagal diperbarui. Coba lagi.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {linked.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Belum ada kontak yang terhubung.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {linked.map((contact) => (
            <li
              key={contact.id}
              className="flex flex-wrap items-start justify-between gap-2 p-3 text-sm"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium break-words">
                    {contact.name}
                  </span>
                  <Badge variant="secondary">
                    {CONTACT_ROLE_LABELS[contact.role]}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
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
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Lepas ${contact.name} dari lamaran ini`}
                disabled={pending}
                onClick={() =>
                  run(
                    () => unlinkContact(applicationId, contact.id),
                    "Kontak dilepas",
                  )
                }
              >
                <Unlink />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {available.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <OptionSelect
            aria-label="Pilih kontak"
            value={selectedId}
            onValueChange={setSelected}
            options={available.map((contact) => ({
              value: contact.id,
              label: contact.name,
            }))}
            className="min-w-48 flex-1"
          />
          <Button
            variant="outline"
            disabled={pending}
            onClick={() =>
              run(
                () => linkContact(applicationId, selectedId),
                "Kontak dihubungkan",
              )
            }
          >
            <Link2 />
            Hubungkan
          </Button>
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Tambah atau edit kontak di halaman{" "}
        <Link href="/contacts" className="underline underline-offset-4">
          Kontak
        </Link>
        .
      </p>
    </div>
  );
}
