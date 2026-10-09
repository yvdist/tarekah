import type { Metadata } from "next";
import { Suspense } from "react";
import { FormSkeleton } from "@/components/skeletons";
import { ApplicationForm } from "@/features/applications/components/application-form";
import { getCompanyNames } from "@/features/applications/queries";
import { getDocumentOptions } from "@/features/documents/queries";

export const metadata: Metadata = { title: "Tambah lamaran" };

export default function NewApplicationPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Tambah lamaran</h1>
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
