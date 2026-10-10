import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { FormSkeleton, TextSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { AiCredentialList } from "@/features/ai/components/ai-credential-list";
import { AiSettingsForm } from "@/features/ai/components/ai-settings-form";
import { getAiSettings } from "@/features/ai/queries";
import { signOutAction } from "@/features/auth/actions";
import { FollowUpSettingsForm } from "@/features/settings/components/follow-up-settings-form";
import { getFollowUpSettings } from "@/features/settings/queries";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Pengaturan" };

// "Tes key" calls the provider from a Server Action of this page.
export const maxDuration = 30;

export default function SettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader
        title="Pengaturan"
        description="Akunmu, kapan sebuah lamaran dianggap perlu disusul, dan key AI-mu."
      />
      <div className="flex flex-col gap-4">
        <Panel
          title="Profil"
          action={
            <form action={signOutAction}>
              <Button type="submit" variant="outline" size="sm">
                <LogOut />
                Keluar
              </Button>
            </form>
          }
        >
          <Suspense fallback={<TextSkeleton />}>
            <Profile />
          </Suspense>
        </Panel>
        <Panel title="Follow-up">
          <Suspense fallback={<FormSkeleton fields={2} bare />}>
            <FollowUpSettings />
          </Suspense>
        </Panel>
        <Panel id="ai" title="AI">
          <Suspense fallback={<FormSkeleton fields={3} bare />}>
            <AiSettings />
          </Suspense>
        </Panel>
      </div>
    </div>
  );
}

async function Profile() {
  const user = await requireUser();

  return (
    <dl className="grid gap-x-6 gap-y-5 text-sm sm:grid-cols-2">
      <div className="flex flex-col gap-1">
        <dt className="text-xs text-muted-foreground">Nama</dt>
        <dd className="break-words">{user.name ?? "—"}</dd>
      </div>
      <div className="flex flex-col gap-1">
        <dt className="text-xs text-muted-foreground">Email</dt>
        <dd className="break-all">{user.email ?? "—"}</dd>
      </div>
    </dl>
  );
}

async function FollowUpSettings() {
  const settings = await getFollowUpSettings();

  return (
    <FollowUpSettingsForm
      defaultValues={{
        followUpAfterDays: String(settings.followUpAfterDays),
        ghostedAfterDays: String(settings.ghostedAfterDays),
      }}
    />
  );
}

async function AiSettings() {
  const { credentials, activeProvider, serverReady } = await getAiSettings();

  if (!serverReady) {
    return (
      <p className="text-sm text-muted-foreground">
        Fitur AI belum diaktifkan di server ini, jadi key belum bisa disimpan.
        Semua fitur lain tetap berjalan seperti biasa.
      </p>
    );
  }

  const saved = credentials.map(({ provider, model, keyLast4 }) => ({
    provider,
    model,
    keyLast4,
  }));

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        Pakai key-mu sendiri untuk mendapat masukan saat latihan. Tanpa key,
        latihan tetap bisa dipakai dan jawabanmu tetap tersimpan.
      </p>
      {saved.length > 0 ? (
        <AiCredentialList credentials={saved} activeProvider={activeProvider} />
      ) : null}
      <AiSettingsForm
        credentials={saved}
        initialProvider={activeProvider ?? "anthropic"}
      />
      <p className="text-xs text-muted-foreground">
        Saat kamu meminta masukan, pertanyaan, jawabanmu dan cerita yang tertaut
        dikirim ke provider yang aktif dengan key-mu sendiri. Key disimpan
        terenkripsi dan tidak pernah ditampilkan lagi.
      </p>
    </div>
  );
}
