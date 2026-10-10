import {
  QUESTION_READINESS,
  type QuestionReadiness,
} from "@/db/schema/enum-values";

type Pickable = { id: string; readiness: QuestionReadiness };

// One question to practise next: a random one among those least ready, so the
// ones marked "belum siap" come first and "siap" only when nothing else is
// left. Null when there is nothing to pick.
//
// `random` is Math.random in the browser. Call this from an event handler,
// never while rendering: a render must not depend on chance.
export function pickQuestionId(
  items: ReadonlyArray<Pickable>,
  random: () => number,
): string | null {
  for (const readiness of QUESTION_READINESS) {
    const group = items.filter((item) => item.readiness === readiness);

    if (group.length > 0) {
      const index = Math.min(
        Math.floor(random() * group.length),
        group.length - 1,
      );

      return group[index].id;
    }
  }

  return null;
}
