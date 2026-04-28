import { setTimeout as sleep } from "node:timers/promises";
import { handleGenerateAc } from "./handlers/generateAC.js";
import { handleGenerateCode } from "./handlers/generateCode.js";
import { handleGeneratePlan } from "./handlers/generatePlan.js";
import { handleValidate } from "./handlers/validate.js";
import type { ClaimedJob, JobHandlerResult } from "./types.js";

type SupportedJobType =
  | "GENERATE_AC"
  | "GENERATE_PLAN"
  | "GENERATE_CODE"
  | "VALIDATE";

interface WorkerConfig {
  convexUrl: string;
  workerSecret: string;
  pollIntervalMs: number;
  claimJobType: SupportedJobType | "ALL";
}

function requireEnv(name: string): string {
  const value = process.env[name];

  if (value === undefined || value.length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function loadConfig(): WorkerConfig {
  const pollIntervalMs = Number.parseInt(requireEnv("POLL_INTERVAL_MS"), 10);
  const claimJobType = requireEnv("CLAIM_JOB_TYPE");

  if (!Number.isFinite(pollIntervalMs) || pollIntervalMs < 0) {
    throw new Error("POLL_INTERVAL_MS must be a non-negative integer");
  }

  if (
    claimJobType !== "GENERATE_AC" &&
    claimJobType !== "GENERATE_PLAN" &&
    claimJobType !== "GENERATE_CODE" &&
    claimJobType !== "VALIDATE" &&
    claimJobType !== "ALL"
  ) {
    throw new Error(`Unsupported CLAIM_JOB_TYPE: ${claimJobType}`);
  }

  return {
    convexUrl: requireEnv("CONVEX_URL"),
    workerSecret: requireEnv("WORKER_SECRET"),
    pollIntervalMs,
    claimJobType,
  };
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

async function claimNextJob(config: WorkerConfig): Promise<ClaimedJob | null> {
  const response = await fetch(`${config.convexUrl}/worker/claim`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.workerSecret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      config.claimJobType === "ALL" ? {} : { type: config.claimJobType },
    ),
  });

  if (!response.ok) {
    throw new Error(`Claim failed with ${response.status}: ${await response.text()}`);
  }

  if (response.status === 204) {
    return null;
  }

  return await parseJsonResponse<ClaimedJob>(response);
}

async function completeJob(
  config: WorkerConfig,
  jobId: string,
  outcome: JobHandlerResult,
): Promise<void> {
  const response = await fetch(`${config.convexUrl}/worker/complete`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.workerSecret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ jobId, ...outcome }),
  });

  if (!response.ok) {
    throw new Error(`Complete failed with ${response.status}: ${await response.text()}`);
  }
}

async function processJob(job: ClaimedJob): Promise<JobHandlerResult> {
  const handlers: Record<SupportedJobType, (claimedJob: ClaimedJob) => Promise<JobHandlerResult>> = {
    GENERATE_AC: handleGenerateAc,
    GENERATE_PLAN: handleGeneratePlan,
    GENERATE_CODE: handleGenerateCode,
    VALIDATE: handleValidate,
  };

  const handler = handlers[job.type as SupportedJobType];

  if (!handler) {
    return {
      status: "failed",
      error: `Unsupported job type in Phase 5 worker: ${job.type}`,
    };
  }

  try {
    return await handler(job);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return {
      status: "failed",
      error: message.slice(0, 4_000),
    };
  }
}

async function runWorker(config: WorkerConfig): Promise<void> {
  let shuttingDown = false;

  const handleShutdown = (signal: string) => {
    if (!shuttingDown) {
      shuttingDown = true;
      console.log(`[worker] received ${signal}, shutting down after the current iteration`);
    }
  };

  process.on("SIGINT", () => handleShutdown("SIGINT"));
  process.on("SIGTERM", () => handleShutdown("SIGTERM"));

  console.log(
    `[worker] starting poll loop for ${config.claimJobType} jobs against ${config.convexUrl}`,
  );

  while (!shuttingDown) {
    try {
      const job = await claimNextJob(config);

      if (job === null) {
        await sleep(config.pollIntervalMs);
        continue;
      }

      console.log(`[worker] claimed ${job.type} job ${job._id} for ticket ${job.ticketId}`);

      const outcome = await processJob(job);

      await completeJob(config, job._id, outcome);

      console.log(`[worker] completed job ${job._id} with status ${outcome.status}`);
      if (outcome.status === "failed") {
        console.error(`[worker] job ${job._id} failed: ${outcome.error}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[worker] loop error: ${message}`);
      await sleep(config.pollIntervalMs);
    }
  }

  console.log("[worker] stopped");
}

const config = loadConfig();

void runWorker(config);
