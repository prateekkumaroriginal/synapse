import type {
  ClaimedJob,
  GenerateAcJobArgs,
  GeneratePlanJobArgs,
} from "./types.js";

export interface BaseContextBundle {
  jobId: string;
  attempt: number;
  ticketTitle: string;
  ticketDescription: string | null;
  ticketType: "TASK" | "BUG";
  gitRemoteUrl: string | null;
  defaultBranch: string | null;
  userPrompt: string | null;
}

export interface AcContextBundle extends BaseContextBundle {
  phase: "TEST_CASE";
}

export interface PlanContextBundle extends BaseContextBundle {
  phase: "PLANNING";
  approvedAcceptanceCriteria: string;
  approvedAcceptanceCriteriaArtifactId: string;
}

function normalizeString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readGenerateAcArgs(args: ClaimedJob["args"]): GenerateAcJobArgs {
  const ticketTitle = normalizeString(args.ticketTitle);

  if (
    args.phase !== "TEST_CASE" ||
    ticketTitle === null ||
    (args.ticketType !== "TASK" && args.ticketType !== "BUG")
  ) {
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

function readGeneratePlanArgs(args: ClaimedJob["args"]): GeneratePlanJobArgs {
  const rawArgs = args as unknown as Record<string, unknown>;
  const ticketTitle = normalizeString(args.ticketTitle);
  const approvedAcceptanceCriteria = normalizeString(
    rawArgs.approvedAcceptanceCriteria,
  );
  const approvedAcceptanceCriteriaArtifactId = normalizeString(
    rawArgs.approvedAcceptanceCriteriaArtifactId,
  );

  if (
    args.phase !== "PLANNING" ||
    ticketTitle === null ||
    (args.ticketType !== "TASK" && args.ticketType !== "BUG")
  ) {
    throw new Error("GENERATE_PLAN job args must include ticketTitle and ticketType");
  }

  if (approvedAcceptanceCriteria === null) {
    throw new Error("GENERATE_PLAN job args must include approvedAcceptanceCriteria");
  }

  if (approvedAcceptanceCriteriaArtifactId === null) {
    throw new Error("GENERATE_PLAN job args must include approvedAcceptanceCriteriaArtifactId");
  }

  return {
    phase: "PLANNING",
    ticketTitle,
    ticketDescription: normalizeString(args.ticketDescription),
    ticketType: args.ticketType,
    gitRemoteUrl: normalizeString(args.gitRemoteUrl),
    defaultBranch: normalizeString(args.defaultBranch),
    userPrompt: normalizeString(args.userPrompt) ?? "",
    approvedAcceptanceCriteria,
    approvedAcceptanceCriteriaArtifactId,
  };
}

export function buildAcContextBundle(job: ClaimedJob): AcContextBundle {
  const args = readGenerateAcArgs(job.args);

  return {
    jobId: job._id,
    attempt: job.attempt,
    phase: args.phase,
    ticketTitle: args.ticketTitle,
    ticketDescription: args.ticketDescription,
    ticketType: args.ticketType,
    gitRemoteUrl: args.gitRemoteUrl,
    defaultBranch: args.defaultBranch,
    userPrompt: normalizeString(args.userPrompt),
  };
}

export function buildPlanContextBundle(job: ClaimedJob): PlanContextBundle {
  const args = readGeneratePlanArgs(job.args);

  return {
    jobId: job._id,
    attempt: job.attempt,
    phase: args.phase,
    ticketTitle: args.ticketTitle,
    ticketDescription: args.ticketDescription,
    ticketType: args.ticketType,
    gitRemoteUrl: args.gitRemoteUrl,
    defaultBranch: args.defaultBranch,
    userPrompt: normalizeString(args.userPrompt),
    approvedAcceptanceCriteria: args.approvedAcceptanceCriteria,
    approvedAcceptanceCriteriaArtifactId: args.approvedAcceptanceCriteriaArtifactId,
  };
}
