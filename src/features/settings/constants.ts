export type FollowUpSettings = {
  followUpAfterDays: number;
  ghostedAfterDays: number;
};

// Used for users without a user_settings row. Mirrors the column defaults in
// src/db/schema/settings.ts.
export const DEFAULT_FOLLOW_UP_SETTINGS: FollowUpSettings = {
  followUpAfterDays: 7,
  ghostedAfterDays: 21,
};

export const MAX_SETTING_DAYS = 365;
