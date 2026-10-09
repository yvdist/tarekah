import { CONTACT_ROLES, type ContactRole } from "@/db/schema/enum-values";

export const CONTACT_ROLE_LABELS: Record<ContactRole, string> = {
  recruiter: "Recruiter",
  referral: "Referral",
  hiring_manager: "Hiring manager",
  other: "Lainnya",
};

export const CONTACT_ROLE_OPTIONS = CONTACT_ROLES.map((value) => ({
  value,
  label: CONTACT_ROLE_LABELS[value],
}));
