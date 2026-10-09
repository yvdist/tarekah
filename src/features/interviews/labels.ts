import { INTERVIEW_STAGES, type InterviewStage } from "@/db/schema/enum-values";

export const INTERVIEW_STAGE_LABELS: Record<InterviewStage, string> = {
  hr: "HR",
  technical: "Teknis",
  user: "User",
  final: "Final",
  other: "Lainnya",
};

export const INTERVIEW_STAGE_OPTIONS = INTERVIEW_STAGES.map((value) => ({
  value,
  label: INTERVIEW_STAGE_LABELS[value],
}));
