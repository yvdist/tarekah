import { Markdown } from "@/components/markdown";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/features/applications/format";
import { INTERVIEW_STAGE_LABELS } from "../labels";
import type { InterviewListItem } from "../queries";
import { InterviewRowActions } from "./interview-actions";

export function InterviewList({
  interviews,
}: {
  interviews: InterviewListItem[];
}) {
  if (interviews.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Belum ada catatan interview.
      </p>
    );
  }

  return (
    <ul className="divide-y rounded-lg border">
      {interviews.map((interview) => (
        <li key={interview.id} className="flex flex-col gap-3 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">
                  {INTERVIEW_STAGE_LABELS[interview.stage]}
                </Badge>
                <span className="text-sm">
                  {formatDateTime(interview.scheduledAt)}
                </span>
              </div>
              {interview.interviewers ? (
                <p className="text-sm text-muted-foreground">
                  {interview.interviewers}
                </p>
              ) : null}
            </div>
            <InterviewRowActions interview={interview} />
          </div>
          {interview.questions ? (
            <div className="flex flex-col gap-1">
              <h3 className="text-xs font-medium text-muted-foreground">
                Pertanyaan
              </h3>
              <Markdown>{interview.questions}</Markdown>
            </div>
          ) : null}
          {interview.reflection ? (
            <div className="flex flex-col gap-1">
              <h3 className="text-xs font-medium text-muted-foreground">
                Refleksi
              </h3>
              <Markdown>{interview.reflection}</Markdown>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
