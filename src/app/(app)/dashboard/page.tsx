import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="text-muted-foreground">
        Belum ada lamaran. Statistik akan muncul di sini setelah kamu mulai
        mencatat lamaran.
      </p>
    </div>
  );
}
