import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { FormSkeleton } from "@/components/skeletons";
import { ApplicationForm } from "@/features/applications/components/application-form";
import {
  getApplication,
  getCompanyNames,
} from "@/features/applications/queries";
import { getDocumentOptions } from "@/features/documents/queries";

export const metadata: Metadata = { title: "Edit lamaran" };

export default function EditApplicationPage({
  params,
}: PageProps<"/applications/[id]/edit">) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader title="Edit lamaran" />
      <Suspense fallback={<FormSkeleton />}>
        <EditApplicationForm params={params} />
      </Suspense>
    </div>
  );
}

// params is request-time data, so it is read behind the boundary.
async function EditApplicationForm({
  params,
}: Pick<PageProps<"/applications/[id]/edit">, "params">) {
  const { id } = await params;
  const [application, companyNames, documentOptions] = await Promise.all([
    getApplication(id),
    getCompanyNames(),
    getDocumentOptions(),
  ]);

  return (
    <ApplicationForm
      applicationId={application.id}
      companyNames={companyNames}
      documentOptions={documentOptions}
      defaultValues={{
        companyName: application.companyName,
        position: application.position,
        jobUrl: application.jobUrl ?? "",
        source: application.source,
        sourceDetail: application.sourceDetail ?? "",
        salaryMin: application.salaryMin?.toString() ?? "",
        salaryMax: application.salaryMax?.toString() ?? "",
        location: application.location ?? "",
        workType: application.workType ?? "",
        appliedAt: application.appliedAt ?? "",
        status: application.status,
        cvDocumentId: application.cvDocumentId ?? "",
        coverLetterDocumentId: application.coverLetterDocumentId ?? "",
        notes: application.notes ?? "",
      }}
    />
  );
}
