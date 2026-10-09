import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { FormSkeleton, TextSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/features/auth/actions";
import { FollowUpSettingsForm } from "@/features/settings/components/follow-up-settings-form";
import { getFollowUpSettings } from "@/features/settings/queries";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Pengaturan" };

export default function SettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader
        title="Pengaturan"
        description="Akunmu dan kapan sebuah lamaran dianggap perlu disusul."
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
          <Suspense fallback={<FormSkeleton fields={2} />}>
            <FollowUpSettings />
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
