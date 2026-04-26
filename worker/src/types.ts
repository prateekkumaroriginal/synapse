export const JOB_TYPES = [
  "GENERATE_AC",
  "GENERATE_PLAN",
  "GENERATE_CODE",
  "VALIDATE",
  "FIX_AFTER_FAILURE",
  "CREATE_PR",
] as const;

export type JobType = (typeof JOB_TYPES)[number];

export type JobStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export interface GenerateAcJobArgs {
  phase: "TEST_CASE";
  ticketTitle: string;
  ticketDescription: string | null;
  ticketType: "TASK" | "BUG";
  gitRemoteUrl: string | null;
  defaultBranch: string | null;
  btcaProjectId: string | null;
  userPrompt: string;
}

export type JobArgs = GenerateAcJobArgs;

export interface ClaimedJob {
  _id: string;
  _creationTime: number;
  ticketId: string;
  projectId: string;
  type: JobType;
  status: JobStatus;
  attempt: number;
  args: JobArgs;
  result?: unknown;
  error?: string;
  idempotencyKey: string;
  artifactId?: string;
  startedAt?: number;
  finishedAt?: number;
}

export interface JobSuccessResult {
  status: "succeeded";
  result: Record<string, unknown>;
}

export interface JobFailureResult {
  status: "failed";
  error: string;
}

export type JobHandlerResult = JobSuccessResult | JobFailureResult;
