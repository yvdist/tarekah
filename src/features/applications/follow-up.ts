import type { ApplicationStatus } from "@/db/schema/enum-values";
import type { FollowUpSettings } from "@/features/settings/constants";
import { daysSince } from "./format";

// Statuses where the next move is the company's, so silence is worth chasing.
export const FOLLOW_UP_STATUSES = [
  "applied",
  "screening",
  "technical_test",
  "interview",
] as const satisfies readonly ApplicationStatus[];

export type FollowUpState = {
  daysInStatus: number;
  // Since the status change or the last follow-up, whichever is later.
  daysSinceActivity: number;
  needsFollowUp: boolean;
  suggestGhosted: boolean;
};

// What a card looks like right after its status changed.
export const FRESH_FOLLOW_UP_STATE: FollowUpState = {
  daysInStatus: 0,
  daysSinceActivity: 0,
  needsFollowUp: false,
  suggestGhosted: false,
};

export function isFollowUpStatus(status: ApplicationStatus) {
  return FOLLOW_UP_STATUSES.some((value) => value === status);
}

// Derived on every read, so there is no stored flag to go stale. A follow-up
// restarts the follow-up count but not the ghosted count: that one measures
// how long the company has been silent.
export function getFollowUpState(
  application: {
    status: ApplicationStatus;
    statusChangedAt: Date;
    lastFollowedUpAt: Date | null;
  },
  settings: FollowUpSettings,
  now: number,
): FollowUpState {
  const daysInStatus = daysSince(application.statusChangedAt, now);
  const daysSinceActivity = application.lastFollowedUpAt
    ? Math.min(daysInStatus, daysSince(application.lastFollowedUpAt, now))
    : daysInStatus;
  const active = isFollowUpStatus(application.status);

  return {
    daysInStatus,
    daysSinceActivity,
    needsFollowUp: active && daysSinceActivity >= settings.followUpAfterDays,
    suggestGhosted: active && daysInStatus >= settings.ghostedAfterDays,
  };
}
