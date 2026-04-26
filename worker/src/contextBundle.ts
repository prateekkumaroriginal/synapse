import type { ClaimedJob } from "./types.js";

export interface ContextBundle {
  jobId: string;
  attempt: number;
  userPrompt: string | null;
}

function readUserPrompt(args: ClaimedJob["args"]): string | null {
  const maybePrompt = args.userPrompt;

  return typeof maybePrompt === "string" && maybePrompt.trim().length > 0
    ? maybePrompt.trim()
    : null;
}

export function buildContextBundle(job: ClaimedJob): ContextBundle {
  return {
    jobId: job._id,
    attempt: job.attempt,
    userPrompt: readUserPrompt(job.args),
  };
}
