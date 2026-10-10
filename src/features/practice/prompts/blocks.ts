import type { InterviewStage } from "@/db/schema/enum-values";
import { clip, escapeTags } from "./tags";

// The blocks of user data more than one prompt carries: a story the candidate
// wrote, and the job a simulation prepares for.

export type StoryContext = {
  title: string;
  situation: string | null;
  task: string | null;
  action: string | null;
  result: string | null;
};

const STORY_PARTS = [
  ["Situation", "situation"],
  ["Task", "task"],
  ["Action", "action"],
  ["Result", "result"],
] as const;

// One story, leaving out the parts not written yet. With an id, the block
// starts with it, so the model can point at the story; with `max`, each part
// is cut to that length.
export function storyBlock(
  story: StoryContext,
  options: { id?: string; max?: number } = {},
) {
  const cut = (text: string) =>
    escapeTags(options.max ? clip(text, options.max) : text);
  const parts = STORY_PARTS.flatMap(([label, key]) =>
    story[key] ? [`${label}: ${cut(story[key])}`] : [],
  );

  return [
    "<story>",
    ...(options.id ? [`Id: ${options.id}`] : []),
    `Title: ${escapeTags(story.title)}`,
    ...parts,
    "</story>",
  ].join("\n");
}

export type ApplicationContext = {
  position: string;
  companyName: string;
  companyNotes: string | null;
  jobDescription: string | null;
  // The stage of the interview being prepared for, when one is on record.
  stage: InterviewStage | null;
};

const STAGE_NAMES: Record<InterviewStage, string> = {
  hr: "HR",
  technical: "Technical",
  user: "Hiring manager",
  final: "Final",
  other: "Other",
};

const COMPANY_NOTES_MAX = 2000;
const JOB_DESCRIPTION_MAX = 6000;

// The job as the user recorded it. A posting is pasted text from somewhere
// else, so it is fenced like everything else the user supplies.
export function applicationBlock(application: ApplicationContext) {
  const lines = [
    "<application>",
    `Position: ${escapeTags(application.position)}`,
    `Company: ${escapeTags(application.companyName)}`,
  ];

  if (application.stage) {
    lines.push(`Interview stage: ${STAGE_NAMES[application.stage]}`);
  }

  if (application.companyNotes?.trim()) {
    lines.push(
      "<company_notes>",
      escapeTags(clip(application.companyNotes, COMPANY_NOTES_MAX)),
      "</company_notes>",
    );
  }

  if (application.jobDescription?.trim()) {
    lines.push(
      "<job_description>",
      escapeTags(clip(application.jobDescription, JOB_DESCRIPTION_MAX)),
      "</job_description>",
    );
  }

  return [...lines, "</application>"].join("\n");
}
