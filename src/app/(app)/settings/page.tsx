import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/features/auth/actions";
import { FollowUpSettingsForm } from "@/features/settings/components/follow-up-settings-form";
import { getFollowUpSettings } from "@/features/settings/queries";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Pengaturan" };

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Pengaturan</h1>
      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Profil</h2>
        <Suspense fallback={<p className="text-muted-foreground">Memuat…</p>}>
          <Profile />
        </Suspense>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Follow-up</h2>
        <Suspense fallback={<p className="text-muted-foreground">Memuat…</p>}>
          <FollowUpSettings />
        </Suspense>
      </section>
      <form action={signOutAction}>
        <Button type="submit" variant="outline">
          <LogOut />
          Keluar
        </Button>
      </form>
    </div>
  );
}

async function Profile() {
  const user = await requireUser();

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
      <dt className="text-muted-foreground">Nama</dt>
      <dd>{user.name ?? "-"}</dd>
      <dt className="text-muted-foreground">Email</dt>
      <dd>{user.email ?? "-"}</dd>
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
