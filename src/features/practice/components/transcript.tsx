import type { PracticeTurnRole } from "@/db/schema/enum-values";
import { cn } from "@/lib/utils";

export type TranscriptTurn = {
  position: number;
  role: Exclude<PracticeTurnRole, "system_event">;
  content: string;
};

const SPEAKERS: Record<TranscriptTurn["role"], string> = {
  interviewer: "Interviewer",
  candidate: "Kamu",
};

// The conversation of a simulation, in order. What the interviewer says reads
// as plain text and what the user answered sits on a quiet surface: two
// voices without chat bubbles. `streaming` is the reply being written, shown
// as the last turn.
export function Transcript({
  turns,
  streaming,
}: {
  turns: ReadonlyArray<TranscriptTurn>;
  streaming?: string;
}) {
  return (
    <ol aria-label="Percakapan" className="flex flex-col gap-5">
      {turns.map((turn) => (
        <li key={turn.position}>
          <Said role={turn.role}>{turn.content}</Said>
        </li>
      ))}
      {streaming === undefined ? null : (
        // Read out once it is whole (see Simulation), not word by word.
        <li aria-hidden>
          <Said role="interviewer">{streaming === "" ? "…" : streaming}</Said>
        </li>
      )}
    </ol>
  );
}

function Said({
  role,
  children,
}: {
  role: TranscriptTurn["role"];
  children: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-muted-foreground">{SPEAKERS[role]}</span>
      <p
        className={cn(
          "text-[0.9375rem] leading-relaxed break-words whitespace-pre-wrap",
          role === "candidate" && "rounded-md bg-muted px-4 py-3",
        )}
      >
        {children}
      </p>
    </div>
  );
}
