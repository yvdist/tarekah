import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { StoryForm } from "@/features/stories/components/story-form";

export const metadata: Metadata = { title: "Tambah cerita" };

export default function NewStoryPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader
        title="Tambah cerita"
        description="Yang wajib hanya judul. Empat bagian STAR bisa diisi sedikit demi sedikit."
      />
      <StoryForm />
    </div>
  );
}
