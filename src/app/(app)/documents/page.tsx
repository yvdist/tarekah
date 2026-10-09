import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { DOCUMENT_TYPES } from "@/db/schema/enum-values";
import {
  AddDocumentButton,
  DocumentRowActions,
} from "@/features/documents/components/document-actions";
import { DOCUMENT_TYPE_LABELS } from "@/features/documents/labels";
import { getDocuments } from "@/features/documents/queries";

export const metadata: Metadata = { title: "Dokumen" };

export default function DocumentsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Dokumen</h1>
        <AddDocumentButton />
      </div>
      <Suspense fallback={<p className="text-muted-foreground">Memuat…</p>}>
        <Documents />
      </Suspense>
    </div>
  );
}

async function Documents() {
  const documents = await getDocuments();

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-16 text-center">
        <h2 className="text-lg font-medium">Belum ada versi dokumen</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Catat versi CV dan cover letter, lalu pilih versi yang dipakai di tiap
          lamaran.
        </p>
      </div>
    );
  }

  return DOCUMENT_TYPES.map((type) => {
    const items = documents.filter((document) => document.type === type);

    return (
      <section key={type} className="flex flex-col gap-3">
        <h2 className="font-medium">{DOCUMENT_TYPE_LABELS[type]}</h2>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada versi.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {items.map((document) => (
              <li
                key={document.id}
                className="flex flex-wrap items-start justify-between gap-3 p-4"
              >
                <div className="flex min-w-0 flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium break-words">
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
                    <span>Dipakai {document.usageCount} lamaran</span>
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
      </section>
    );
  });
}
