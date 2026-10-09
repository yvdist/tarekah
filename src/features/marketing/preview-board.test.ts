import { describe, expect, it } from "vitest";
import { MOVING_CARD_ID, PREVIEW_COLUMNS, moveCard } from "./preview-board";

function column(columns: ReturnType<typeof moveCard>, status: string) {
  const found = columns.find((item) => item.status === status);

  if (!found) {
    throw new Error(`no ${status} column`);
  }

  return found;
}

describe("moveCard", () => {
  it("moves the card to the end of the target column", () => {
    const moved = moveCard(PREVIEW_COLUMNS, MOVING_CARD_ID, "offer");

    expect(column(moved, "interview").cards.map((card) => card.id)).toEqual([
      "Nara Travel",
    ]);
    expect(column(moved, "offer").cards.map((card) => card.id)).toEqual([
      "Sagara Analytics",
      MOVING_CARD_ID,
    ]);
  });

  it("keeps the column counts in step", () => {
    const moved = moveCard(PREVIEW_COLUMNS, MOVING_CARD_ID, "offer");

    expect(column(moved, "interview").count).toBe(2);
    expect(column(moved, "offer").count).toBe(2);
    expect(column(moved, "applied").count).toBe(5);
  });

  it("restarts the day count, as a status change does", () => {
    const moved = moveCard(PREVIEW_COLUMNS, MOVING_CARD_ID, "offer");
    const card = column(moved, "offer").cards.at(-1);

    expect(card?.status).toBe("offer");
    expect(card?.followUp.daysInStatus).toBe(0);
  });

  it("leaves the board alone for an unknown card or the same column", () => {
    expect(moveCard(PREVIEW_COLUMNS, "Tidak Ada", "offer")).toEqual(
      PREVIEW_COLUMNS,
    );
    expect(moveCard(PREVIEW_COLUMNS, MOVING_CARD_ID, "interview")).toEqual(
      PREVIEW_COLUMNS,
    );
  });

  it("does not change the columns it was given", () => {
    moveCard(PREVIEW_COLUMNS, MOVING_CARD_ID, "offer");

    expect(column([...PREVIEW_COLUMNS], "interview").cards).toHaveLength(2);
  });
});
