import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { formatDateTime } from "@/features/applications/format";
import { INTERVIEW_TYPE_LABELS, SESSION_STATUS_LABELS } from "../labels";
import { getPracticeHistory } from "../queries";

// The user's latest simulations. One still in progress can be continued; the
// others open to be read. A finished one opens straight to its summary when
// it has one: the history is read on every request, while the session page
// reads the database itself, so the link is what carries that fact across.
export async function SessionHistory() {
  const sessions = await getPracticeHistory();

  if (sessions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Belum ada simulasi. Sesi yang kamu jalani muncul di sini dan bisa dibuka
        lagi kapan saja.
      </p>
    );
  }

  return (
    <ul aria-label="Riwayat simulasi" className="-my-3 divide-y">
      {sessions.map((session) => {
        const inProgress = session.status === "in_progress";
        const summarized = session.status === "completed" && session.summarized;

        return (
          <li
            key={session.id}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3"
          >
            <div className="flex min-w-0 flex-1 basis-64 flex-col gap-1">
              <p className="text-sm break-words">
                {INTERVIEW_TYPE_LABELS[session.interviewType]}
                {session.position
                  ? ` · ${session.position} di ${session.companyName}`
                  : null}
              </p>
              <p className="text-xs text-muted-foreground">
                <span className="font-figure">
                  {formatDateTime(session.startedAt)}
                </span>{" "}
                · {SESSION_STATUS_LABELS[session.status]}
              </p>
            </div>
            <Link
              href={
                summarized
                  ? `/practice/simulation/${session.id}?summary=ready`
                  : `/practice/simulation/${session.id}`
              }
              aria-label={`${
                inProgress
                  ? "Lanjutkan"
                  : summarized
                    ? "Lihat ringkasan"
                    : "Buka"
              } simulasi ${INTERVIEW_TYPE_LABELS[session.interviewType]}, ${formatDateTime(session.startedAt)}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {inProgress ? "Lanjutkan" : summarized ? "Ringkasan" : "Buka"}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
