import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { ListSkeleton } from "@/components/skeletons";
import { Badge } from "@/components/ui/badge";
import { DOCUMENT_TYPES } from "@/db/schema/enum-values";
import {
  AddDocumentButton,
  DocumentRowActions,
} from "@/features/documents/components/document-actions";
import { DOCUMENT_TYPE_LABELS } from "@/features/documents/labels";
import { getDocuments } from "@/features/documents/queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dokumen" };

export default function DocumentsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dokumen"
        description="Versi CV dan cover letter yang kamu kirim, supaya tahu mana yang dipakai di tiap lamaran."
        actions={<AddDocumentButton size="lg" />}
      />
      <Suspense fallback={<ListSkeleton />}>
        <Documents />
      </Suspense>
    </div>
  );
}

async function Documents() {
  const documents = await getDocuments();

  if (documents.length === 0) {
    return (
      <EmptyState
        title="Simpan versi CV pertamamu"
        description="Catat versi CV dan cover letter, lalu pilih versi yang dipakai di tiap lamaran."
      >
        <AddDocumentButton variant="outline" />
      </EmptyState>
    );
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      {DOCUMENT_TYPES.map((type) => {
        const items = documents.filter((document) => document.type === type);

        return (
          <Panel
            key={type}
            title={DOCUMENT_TYPE_LABELS[type]}
            hint={
              items.length > 0 ? (
                <>
                  <span className="font-figure">{items.length}</span> versi
                </>
              ) : null
            }
          >
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada versi.</p>
            ) : (
              <ul className="-my-4 divide-y">
                {items.map((document) => (
                  <li
                    key={document.id}
                    className="flex items-start justify-between gap-3 py-4"
                  >
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "font-medium break-words",
                            document.isArchived && "text-muted-foreground",
                          )}
                        >
                          {document.label}
                        </span>
                        {document.isArchived ? (
                          <Badge variant="outline">Diarsipkan</Badge>
                        ) : null}
                      </div>
                      {document.notes ? (
                        <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                          {document.notes}
                        </p>
                      ) : null}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>
                          Dipakai{" "}
                          <span className="font-figure">
                            {document.usageCount}
                          </span>{" "}
                          lamaran
                        </span>
                        {document.url ? (
                          <a
                            href={document.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 underline underline-offset-4"
                          >
                            Buka file
                            <ExternalLink className="size-3 shrink-0" />
                          </a>
                        ) : null}
                      </div>
                    </div>
                    <DocumentRowActions document={document} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        );
      })}
    </div>
  );
}
