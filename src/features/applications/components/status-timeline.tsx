import { formatDateTime } from "../format";
import type { ApplicationDetail } from "../queries";
import { StatusBadge } from "./status-badge";

export function StatusTimeline({
  events,
}: {
  events: ApplicationDetail["statusEvents"];
}) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Belum ada riwayat status untuk lamaran ini.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-3">
      {events.map((event) => (
        <li key={event.id} className="flex flex-col gap-1 border-l-2 pl-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {event.fromStatus ? (
              <>
                <StatusBadge status={event.fromStatus} />
                <span aria-hidden className="text-muted-foreground">
                  ke
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">Dibuat sebagai</span>
            )}
            <StatusBadge status={event.toStatus} />
          </div>
          <time
            dateTime={event.changedAt.toISOString()}
            className="text-xs text-muted-foreground"
          >
            {formatDateTime(event.changedAt)}
          </time>
          {event.note ? <p className="text-sm">{event.note}</p> : null}
        </li>
      ))}
    </ol>
  );
}
