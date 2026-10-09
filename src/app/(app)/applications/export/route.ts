import { applicationsToCsv } from "@/features/applications/csv";
import { getApplicationsForExport } from "@/features/applications/queries";
import { todayInJakarta } from "@/features/dashboard/range";

// Read-only download of the signed-in user's applications. The query resolves
// the user from the session, so a signed-out request is redirected to /login.
export async function GET() {
  const rows = await getApplicationsForExport();
  const filename = `tarekah-lamaran-${todayInJakarta(Date.now())}.csv`;

  return new Response(applicationsToCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
