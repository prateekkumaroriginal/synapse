import type { ClaimedJob, GenerateAcJobArgs } from "./types.js";

export interface ContextBundle {
  jobId: string;
  attempt: number;
  ticketTitle: string;
  ticketDescription: string | null;
  ticketType: "TASK" | "BUG";
  gitRemoteUrl: string | null;
  defaultBranch: string | null;
  userPrompt: string | null;
}

function normalizeString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readGenerateAcArgs(args: ClaimedJob["args"]): GenerateAcJobArgs {
  const ticketTitle = normalizeString(args.ticketTitle);

  if (ticketTitle === null || (args.ticketType !== "TASK" && args.ticketType !== "BUG")) {
    throw new Error("GENERATE_AC job args must include ticketTitle and ticketType");
  }

  return {
    phase: "TEST_CASE",
    ticketTitle,
    ticketDescription: normalizeString(args.ticketDescription),
    ticketType: args.ticketType,
    gitRemoteUrl: normalizeString(args.gitRemoteUrl),
    defaultBranch: normalizeString(args.defaultBranch),
    userPrompt: normalizeString(args.userPrompt) ?? "",
  };
}

export function buildContextBundle(job: ClaimedJob): ContextBundle {
  const args = readGenerateAcArgs(job.args);

  return {
    jobId: job._id,
    attempt: job.attempt,
    ticketTitle: args.ticketTitle,
    ticketDescription: args.ticketDescription,
    ticketType: args.ticketType,
    gitRemoteUrl: args.gitRemoteUrl,
    defaultBranch: args.defaultBranch,
    userPrompt: normalizeString(args.userPrompt),
  };
}
