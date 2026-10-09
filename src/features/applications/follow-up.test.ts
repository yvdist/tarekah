import { describe, expect, it } from "vitest";
import { APPLICATION_STATUSES } from "@/db/schema/enum-values";
import {
  FOLLOW_UP_STATUSES,
  getFollowUpState,
  isFollowUpStatus,
} from "./follow-up";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 9, 5);
const SETTINGS = { followUpAfterDays: 7, ghostedAfterDays: 21 };

const daysAgo = (days: number) => new Date(NOW - days * DAY);

describe("isFollowUpStatus", () => {
  it("covers only the statuses waiting on the company", () => {
    expect(APPLICATION_STATUSES.filter(isFollowUpStatus)).toEqual([
      ...FOLLOW_UP_STATUSES,
    ]);
  });
});

describe("getFollowUpState", () => {
  it("does not flag an application one day before the threshold", () => {
    const state = getFollowUpState(
      {
        status: "applied",
        statusChangedAt: daysAgo(6),
        lastFollowedUpAt: null,
      },
      SETTINGS,
      NOW,
    );

    expect(state).toEqual({
      daysInStatus: 6,
      daysSinceActivity: 6,
      needsFollowUp: false,
      suggestGhosted: false,
    });
  });

  it("flags an application exactly at the threshold", () => {
    const state = getFollowUpState(
      {
        status: "applied",
        statusChangedAt: daysAgo(7),
        lastFollowedUpAt: null,
      },
      SETTINGS,
      NOW,
    );

    expect(state.needsFollowUp).toBe(true);
    expect(state.suggestGhosted).toBe(false);
  });

  it("counts whole days only", () => {
    const state = getFollowUpState(
      {
        status: "applied",
        statusChangedAt: new Date(NOW - 7 * DAY + 1),
        lastFollowedUpAt: null,
      },
      SETTINGS,
      NOW,
    );

    expect(state.daysInStatus).toBe(6);
    expect(state.needsFollowUp).toBe(false);
  });

  it("restarts the follow-up count after a follow-up", () => {
    const state = getFollowUpState(
      {
        status: "screening",
        statusChangedAt: daysAgo(10),
        lastFollowedUpAt: daysAgo(2),
      },
      SETTINGS,
      NOW,
    );

    expect(state.daysInStatus).toBe(10);
    expect(state.daysSinceActivity).toBe(2);
    expect(state.needsFollowUp).toBe(false);
  });

  it("flags again once the follow-up itself is old enough", () => {
    const state = getFollowUpState(
      {
        status: "screening",
        statusChangedAt: daysAgo(18),
        lastFollowedUpAt: daysAgo(7),
      },
      SETTINGS,
      NOW,
    );

    expect(state.needsFollowUp).toBe(true);
  });

  it("ignores a follow-up made before the last status change", () => {
    const state = getFollowUpState(
      {
        status: "interview",
        statusChangedAt: daysAgo(3),
        lastFollowedUpAt: daysAgo(12),
      },
      SETTINGS,
      NOW,
    );

    expect(state.daysSinceActivity).toBe(3);
    expect(state.needsFollowUp).toBe(false);
  });

  it("suggests ghosted from the status change, whatever the follow-ups", () => {
    const state = getFollowUpState(
      {
        status: "technical_test",
        statusChangedAt: daysAgo(21),
        lastFollowedUpAt: daysAgo(1),
      },
      SETTINGS,
      NOW,
    );

    expect(state.needsFollowUp).toBe(false);
    expect(state.suggestGhosted).toBe(true);
  });

  it("does not suggest ghosted one day before its threshold", () => {
    const state = getFollowUpState(
      {
        status: "applied",
        statusChangedAt: daysAgo(20),
        lastFollowedUpAt: null,
      },
      SETTINGS,
      NOW,
    );

    expect(state.needsFollowUp).toBe(true);
    expect(state.suggestGhosted).toBe(false);
  });

  it.each(["wishlist", "offer", "rejected", "ghosted"] as const)(
    "never flags %s, however old",
    (status) => {
      const state = getFollowUpState(
        { status, statusChangedAt: daysAgo(90), lastFollowedUpAt: null },
        SETTINGS,
        NOW,
      );

      expect(state.daysInStatus).toBe(90);
      expect(state.needsFollowUp).toBe(false);
      expect(state.suggestGhosted).toBe(false);
    },
  );

  it("uses the thresholds it is given", () => {
    const state = getFollowUpState(
      {
        status: "applied",
        statusChangedAt: daysAgo(3),
        lastFollowedUpAt: null,
      },
      { followUpAfterDays: 2, ghostedAfterDays: 3 },
      NOW,
    );

    expect(state.needsFollowUp).toBe(true);
    expect(state.suggestGhosted).toBe(true);
  });

  it("treats a status change dated in the future as today", () => {
    const state = getFollowUpState(
      {
        status: "applied",
        statusChangedAt: daysAgo(-5),
        lastFollowedUpAt: null,
      },
      SETTINGS,
      NOW,
    );

    expect(state.daysInStatus).toBe(0);
    expect(state.needsFollowUp).toBe(false);
  });
});
