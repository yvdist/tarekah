"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { QuestionReadiness } from "@/db/schema/enum-values";
import { pickQuestionId } from "../pick";

export type PickableQuestion = { id: string; readiness: QuestionReadiness };

// Opens a drill on a question picked at random, least ready first. The pick
// happens on click: a render may not depend on chance, and a refresh would
// otherwise change the question under the user.
export function RandomQuestionButton({
  items,
  excludeId,
  variant,
  children,
}: {
  items: ReadonlyArray<PickableQuestion>;
  // The question being practised, when asking for the next one.
  excludeId?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const hasChoice = items.some((item) => item.id !== excludeId);

  return (
    <Button
      type="button"
      variant={variant}
      disabled={!hasChoice}
      onClick={() => {
        const id = pickQuestionId(items, { excludeId, random: Math.random });

        if (id) {
          router.push(`/practice/drill/${id}`);
        }
      }}
    >
      {children}
    </Button>
  );
}
