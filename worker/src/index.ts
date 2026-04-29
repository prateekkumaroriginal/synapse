import { setTimeout as sleep } from "node:timers/promises";
import { handleGenerateAc } from "./handlers/generateAC.js";
import type { ClaimedJob, CodexConfig, CodexProvider, JobHandlerResult } from "./types.js";

type SupportedJobType = "GENERATE_AC";

interface WorkerConfig {
  convexUrl: string;
  workerSecret: string;
  pollIntervalMs: number;
  claimJobType: SupportedJobType;
  codex: CodexConfig;
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
  const claimJobType = requireEnv("CLAIM_JOB_TYPE") as SupportedJobType;
  const codexProvider = requireEnv("CODEX_PROVIDER") as CodexProvider;
  const codexModel = requireEnv("CODEX_MODEL");

  if (!Number.isFinite(pollIntervalMs) || pollIntervalMs < 0) {
    throw new Error("POLL_INTERVAL_MS must be a non-negative integer");
  }

  if (claimJobType !== "GENERATE_AC") {
    throw new Error(`Unsupported CLAIM_JOB_TYPE: ${claimJobType}`);
  }

  const providerApiKeys: Record<CodexProvider, string> = {
    openai: "OPENAI_API_KEY",
    anthropic: "ANTHROPIC_API_KEY",
    gemini: "GEMINI_API_KEY",
  };

  const apiKeyName = providerApiKeys[codexProvider];

  if (apiKeyName === undefined) {
    throw new Error(`Unsupported CODEX_PROVIDER: ${codexProvider}`);
  }

  requireEnv(apiKeyName);

  if (codexProvider !== "openai") {
    throw new Error(
      `CODEX_PROVIDER=${codexProvider} is not supported by the installed Codex CLI API-key flow. ` +
        "Codex CLI 0.125.0 requires a Responses-compatible provider; use CODEX_PROVIDER=openai.",
    );
  }

  return {
    convexUrl: requireEnv("CONVEX_URL"),
    workerSecret: requireEnv("WORKER_SECRET"),
    pollIntervalMs,
    claimJobType,
    codex: {
      provider: codexProvider,
      cliProvider: codexProvider,
      model: codexModel,
    },
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
    body: JSON.stringify({ type: config.claimJobType }),
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

async function processJob(config: WorkerConfig, job: ClaimedJob): Promise<JobHandlerResult> {
  const handlers: Record<
    SupportedJobType,
    (claimedJob: ClaimedJob, codex: CodexConfig) => Promise<JobHandlerResult>
  > = {
    GENERATE_AC: handleGenerateAc,
  };

  const handler = handlers[job.type as SupportedJobType];

  if (!handler) {
    return {
      status: "failed",
      error: `Unsupported job type: ${job.type}`,
    };
  }

  try {
    return await handler(job, config.codex);
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

      const outcome = await processJob(config, job);

      await completeJob(config, job._id, outcome);

      console.log(`[worker] completed job ${job._id} with status ${outcome.status}`);
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
