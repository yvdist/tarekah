import {
  APPLICATION_STATUSES,
  JOB_SOURCES,
  WORK_TYPES,
  type ApplicationStatus,
  type JobSource,
  type WorkType,
} from "@/db/schema/enum-values";

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  wishlist: "Wishlist",
  applied: "Dilamar",
  screening: "Screening",
  technical_test: "Tes teknis",
  interview: "Interview",
  offer: "Offer",
  rejected: "Ditolak",
  ghosted: "Tanpa kabar",
};

export const SOURCE_LABELS: Record<JobSource, string> = {
  linkedin: "LinkedIn",
  glints: "Glints",
  kalibrr: "Kalibrr",
  jobstreet: "JobStreet",
  referral: "Referral",
  other: "Lainnya",
};

export const WORK_TYPE_LABELS: Record<WorkType, string> = {
  onsite: "On-site",
  hybrid: "Hybrid",
  remote: "Remote",
};

export const STATUS_OPTIONS = APPLICATION_STATUSES.map((value) => ({
  value,
  label: STATUS_LABELS[value],
}));

export const SOURCE_OPTIONS = JOB_SOURCES.map((value) => ({
  value,
  label: SOURCE_LABELS[value],
}));

export const WORK_TYPE_OPTIONS = WORK_TYPES.map((value) => ({
  value,
  label: WORK_TYPE_LABELS[value],
}));

// Position in the pipeline, used to sort by status.
export const STATUS_ORDER: Record<ApplicationStatus, number> =
  Object.fromEntries(
    APPLICATION_STATUSES.map((status, index) => [status, index]),
  ) as Record<ApplicationStatus, number>;
