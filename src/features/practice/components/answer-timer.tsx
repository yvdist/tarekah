"use client";

import { Timer } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const pad = (value: number) => String(value).padStart(2, "0");

// Counts up while the user answers. Off until asked for, with no limit and no
// warning colour: it tells how long an answer ran, it does not hurry anyone.
export function AnswerTimer({ paused }: { paused: boolean }) {
  const [on, setOn] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const startedAt = useRef(0);

  useEffect(() => {
    if (!on || paused) {
      return;
    }

    // Read from the clock rather than counted, so a throttled tab stays right.
    const interval = setInterval(
      () => setSeconds(Math.floor((Date.now() - startedAt.current) / 1000)),
      1000,
    );

    return () => clearInterval(interval);
  }, [on, paused]);

  function toggle() {
    startedAt.current = Date.now();
    setSeconds(0);
    setOn(!on);
  }

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      {on ? (
        <span role="timer" aria-label="Lama menjawab" className="font-figure">
          {pad(Math.floor(seconds / 60))}:{pad(seconds % 60)}
        </span>
      ) : null}
      {paused ? null : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={on}
          onClick={toggle}
        >
          <Timer />
          {on ? "Matikan timer" : "Nyalakan timer"}
        </Button>
      )}
    </div>
  );
}
