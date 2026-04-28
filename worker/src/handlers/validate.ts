import { runCommand, truncate } from "../command.js";
import { getExistingWorkspace } from "../gitWorkspace.js";
import type { ClaimedJob, JobHandlerResult, ValidateJobArgs } from "../types.js";

const MAX_ERROR_CHARS = 4_000;
const MAX_LOG_CHARS = 6_000;

type ValidationStatus = "PASSED" | "FAILED" | "SKIPPED";
type OverallStatus = "PASSED" | "FAILED";

interface ValidationStep {
  name: string;
  command?: string;
  status: ValidationStatus;
  startedAt: number;
  finishedAt: number;
  logExcerpt?: string;
}

function normalizeString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readArgs(job: ClaimedJob): ValidateJobArgs {
  const raw = job.args as Partial<ValidateJobArgs>;
  const changedFiles = Array.isArray(raw.changedFiles)
    ? raw.changedFiles.filter((value): value is string => typeof value === "string")
    : [];

  return {
    codeJobId: normalizeString(raw.codeJobId) ?? "",
    branchName: normalizeString(raw.branchName),
    commitSha: normalizeString(raw.commitSha),
    changedFiles,
    gitRemoteUrl: normalizeString(raw.gitRemoteUrl),
    defaultBranch: normalizeString(raw.defaultBranch),
    workspacePath: normalizeString(raw.workspacePath),
  };
}

function requireEnv(name: string): string {
  const value = process.env[name];

  if (value === undefined || value.length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

async function runValidationStep(
  repoDir: string,
  name: string,
  command: string,
  args: string[],
): Promise<ValidationStep> {
  const startedAt = Date.now();
  const commandText = [command, ...args].join(" ");

  try {
    const result = await runCommand(command, args, {
      cwd: repoDir,
      timeoutMs: 300_000,
    });
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n");

    return {
      name,
      command: commandText,
      status: "PASSED",
      startedAt,
      finishedAt: Date.now(),
      ...(output.trim().length > 0 && {
        logExcerpt: truncate(output, MAX_LOG_CHARS),
      }),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return {
      name,
      command: commandText,
      status: "FAILED",
      startedAt,
      finishedAt: Date.now(),
      logExcerpt: truncate(message, MAX_LOG_CHARS),
    };
  }
}

async function recordValidationRun(
  job: ClaimedJob,
  args: ValidateJobArgs,
  steps: ValidationStep[],
  overallStatus: OverallStatus,
  startedAt: number,
  finishedAt: number,
): Promise<string> {
  const convexUrl = requireEnv("CONVEX_URL");
  const workerSecret = requireEnv("WORKER_SECRET");
  const response = await fetch(`${convexUrl}/worker/validation-runs`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${workerSecret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jobId: job._id,
      ticketId: job.ticketId,
      codeJobId: args.codeJobId || undefined,
      commitSha: args.commitSha ?? undefined,
      branchName: args.branchName ?? undefined,
      steps,
      overallStatus,
      startedAt,
      finishedAt,
    }),
  });

  if (!response.ok) {
    throw new Error(`Validation run recording failed with ${response.status}: ${await response.text()}`);
  }

  const payload = await response.json() as { validationRunId?: string };
  return payload.validationRunId ?? "";
}

export async function handleValidate(job: ClaimedJob): Promise<JobHandlerResult> {
  const startedAt = Date.now();
  const steps: ValidationStep[] = [];

  try {
    const args = readArgs(job);

    if (!args.workspacePath) {
      throw new Error("Generated workspacePath is required to validate unpushed generated code");
    }

    const repoDir = await getExistingWorkspace(args.workspacePath);

    if (args.commitSha) {
      await runCommand("git", ["checkout", args.commitSha], {
        cwd: repoDir,
        timeoutMs: 120_000,
      });
    } else if (args.branchName) {
      await runCommand("git", ["checkout", args.branchName], {
        cwd: repoDir,
        timeoutMs: 120_000,
      });
    }

    const validationCommands: Array<{
      name: string;
      command: string;
      args: string[];
    }> = [
      {
        name: "Install dependencies",
        command: "pnpm",
        args: ["install", "--frozen-lockfile"],
      },
      { name: "Build", command: "pnpm", args: ["run", "build"] },
      { name: "Lint", command: "pnpm", args: ["run", "lint"] },
    ];

    for (const stepConfig of validationCommands) {
      const step = await runValidationStep(
        repoDir,
        stepConfig.name,
        stepConfig.command,
        stepConfig.args,
      );
      steps.push(step);

      if (step.status === "FAILED") {
        break;
      }
    }

    const overallStatus: OverallStatus = steps.some((step) => step.status === "FAILED")
      ? "FAILED"
      : "PASSED";
    const finishedAt = Date.now();
    const validationRunId = await recordValidationRun(
      job,
      args,
      steps,
      overallStatus,
      startedAt,
      finishedAt,
    );

    if (overallStatus === "FAILED") {
      return {
        status: "failed",
        error: truncate("Validation failed. See validation run details for step logs.", MAX_ERROR_CHARS),
      };
    }

    return {
      status: "succeeded",
      result: {
        validationRunId,
        overallStatus,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const finishedAt = Date.now();

    if (steps.length > 0) {
      try {
        await recordValidationRun(
          job,
          readArgs(job),
          steps,
          "FAILED",
          startedAt,
          finishedAt,
        );
      } catch {
        // Preserve the original validation error for the job failure.
      }
    }

    return {
      status: "failed",
      error: truncate(message, MAX_ERROR_CHARS),
    };
  }
}
