import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { FormSkeleton } from "@/components/skeletons";
import { ApplicationForm } from "@/features/applications/components/application-form";
import { getCompanyNames } from "@/features/applications/queries";
import { getDocumentOptions } from "@/features/documents/queries";

export const metadata: Metadata = { title: "Tambah lamaran" };

export default function NewApplicationPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader
        title="Tambah lamaran"
        description="Yang wajib hanya perusahaan dan posisi. Sisanya bisa menyusul."
      />
      <Suspense fallback={<FormSkeleton />}>
        <NewApplicationForm />
      </Suspense>
    </div>
  );
}

async function NewApplicationForm() {
  const [companyNames, documentOptions] = await Promise.all([
    getCompanyNames(),
    getDocumentOptions(),
  ]);

  return (
    <ApplicationForm
      companyNames={companyNames}
      documentOptions={documentOptions}
    />
  );
}
