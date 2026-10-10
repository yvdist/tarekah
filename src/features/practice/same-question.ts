import {
  QUESTION_READINESS,
  type QuestionReadiness,
} from "@/db/schema/enum-values";

// How two questions are compared: case, spacing and closing punctuation do not
// make a different question.
export function normalizeQuestionText(text: string) {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[\s?.!]+$/, "");
}

type Groupable = {
  id: string;
  text: string;
  readiness: QuestionReadiness;
  stories: ReadonlyArray<unknown>;
};

export type QuestionGroup<T> = T & {
  // How many rows of the bank ask this question, the one shown included.
  copies: number;
  // Their ids, to tell whether a given row belongs to this group.
  ids: string[];
};

// The bank keeps one row for every interview a question was asked in, so the
// same question can be there many times. To practise, it is one question:
// this folds the rows that ask the same thing into one.
//
// The row that stands for the group is the one the user has worked on most:
// the most ready, then the one with the most stories, then the first in the
// list (the newest). So marking one copy ready makes the question ready, and
// the stories linked to it are the crib. The order of the list is kept.
export function groupSameQuestions<T extends Groupable>(
  items: ReadonlyArray<T>,
): QuestionGroup<T>[] {
  const groups = new Map<string, QuestionGroup<T>>();

  for (const item of items) {
    const key = normalizeQuestionText(item.text);
    const group = groups.get(key);

    if (!group) {
      groups.set(key, { ...item, copies: 1, ids: [item.id] });
      continue;
    }

    const { copies, ids } = group;

    // A Map keeps the position of a key it already has.
    groups.set(key, {
      ...(isMoreWorkedOn(item, group) ? item : group),
      copies: copies + 1,
      ids: [...ids, item.id],
    });
  }

  return [...groups.values()];
}

const rank = (readiness: QuestionReadiness) =>
  QUESTION_READINESS.indexOf(readiness);

function isMoreWorkedOn(candidate: Groupable, current: Groupable) {
  if (candidate.readiness !== current.readiness) {
    return rank(candidate.readiness) > rank(current.readiness);
  }

  return candidate.stories.length > current.stories.length;
}
