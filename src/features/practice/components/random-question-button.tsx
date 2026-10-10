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
  variant,
  children,
}: {
  items: ReadonlyArray<PickableQuestion>;
  variant?: React.ComponentProps<typeof Button>["variant"];
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <Button
      type="button"
      variant={variant}
      disabled={items.length === 0}
      onClick={() => {
        const id = pickQuestionId(items, Math.random);

        if (id) {
          router.push(`/practice/drill/${id}`);
        }
      }}
    >
      {children}
    </Button>
  );
}
