import { setTimeout as sleep } from "node:timers/promises";
import { handleGenerateAc } from "./handlers/generateAC.js";
import { handleGeneratePlan } from "./handlers/generatePlan.js";
import type {
  AcGenerationConfig,
  ClaimedJob,
  ContextModelProvider,
  JobHandlerResult,
} from "./types.js";

type SupportedJobType = "GENERATE_AC" | "GENERATE_PLAN";

const SUPPORTED_JOB_TYPES = new Set<string>(["GENERATE_AC", "GENERATE_PLAN"]);

interface WorkerConfig {
  convexUrl: string;
  workerSecret: string;
  pollIntervalMs: number;
  claimJobType: SupportedJobType;
  acGeneration: AcGenerationConfig;
}

function requireEnv(name: string): string {
  const value = process.env[name];

  if (value === undefined || value.length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function requireAnyEnv(names: string[]): string {
  const configuredName = names.find((name) => {
    const value = process.env[name];
    return value !== undefined && value.length > 0;
  });

  if (configuredName === undefined) {
    throw new Error(
      `Missing Forge provider authentication. Set at least one of: ${names.join(", ")}`,
    );
  }

  return configuredName;
}

function optionalEnv(name: string): string {
  return process.env[name] ?? "";
}

function parseRequiredNonNegativeInteger(name: string): number {
  const value = Number.parseInt(requireEnv(name), 10);

  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }

  return value;
}

function parseOptionalNonNegativeInteger(name: string, fallback: number): number {
  const rawValue = process.env[name];

  if (rawValue === undefined || rawValue.length === 0) {
    return fallback;
  }

  const value = Number.parseInt(rawValue, 10);

  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }

  return value;
}

function readClaimJobType(): SupportedJobType {
  const claimJobType = requireEnv("CLAIM_JOB_TYPE");

  if (!SUPPORTED_JOB_TYPES.has(claimJobType)) {
    throw new Error(
      `CLAIM_JOB_TYPE must be one of: ${Array.from(SUPPORTED_JOB_TYPES).join(", ")}`,
    );
  }

  return claimJobType as SupportedJobType;
}

function loadConfig(): WorkerConfig {
  const pollIntervalMs = parseRequiredNonNegativeInteger("POLL_INTERVAL_MS");
  const claimJobType = readClaimJobType();
  const requiresContextModel = claimJobType === "GENERATE_AC";
  const contextModelProvider = (
    requiresContextModel
      ? requireEnv("CONTEXT_MODEL_PROVIDER")
      : (process.env.CONTEXT_MODEL_PROVIDER ?? "openai")
  ) as ContextModelProvider;
  const contextModelApiKey =
    contextModelProvider === "bedrock-anthropic"
      ? ""
      : requiresContextModel
        ? requireEnv("CONTEXT_MODEL_API_KEY")
        : (process.env.CONTEXT_MODEL_API_KEY ?? "");
  const contextModelBaseUrl = process.env.CONTEXT_MODEL_BASE_URL || null;
  const bedrockRegion =
    process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || null;

  if (
    requiresContextModel &&
    contextModelProvider === "bedrock-anthropic" &&
    bedrockRegion === null
  ) {
    throw new Error("AWS_REGION or AWS_DEFAULT_REGION is required for bedrock-anthropic");
  }

  requireAnyEnv([
    "ANTHROPIC_API_KEY",
    "GEMINI_API_KEY",
    "GOOGLE_AI_STUDIO_API_KEY",
    "OPENAI_API_KEY",
    "OPENROUTER_API_KEY",
    "FORGE_PROVIDER_API_KEY",
    "AWS_ACCESS_KEY_ID",
  ]);

  return {
    convexUrl: requireEnv("CONVEX_URL"),
    workerSecret: requireEnv("WORKER_SECRET"),
    pollIntervalMs,
    claimJobType,
    acGeneration: {
      contextModelProvider,
      contextModelName: requiresContextModel
        ? requireEnv("CONTEXT_MODEL_NAME")
        : (process.env.CONTEXT_MODEL_NAME ?? ""),
      contextModelApiKey,
      contextModelBaseUrl,
      contextModelTimeoutMs: requiresContextModel
        ? parseRequiredNonNegativeInteger("CONTEXT_MODEL_TIMEOUT_MS")
        : parseOptionalNonNegativeInteger(
            "CONTEXT_MODEL_TIMEOUT_MS",
            0,
          ),
      bedrockRegion,
      forgeBin: requireEnv("FORGE_BIN"),
      forgeAgent: optionalEnv("FORGE_AGENT"),
      forgePromptFlag: requireEnv("FORGE_PROMPT_FLAG"),
      forgeTimeoutMs: parseRequiredNonNegativeInteger("FORGE_TIMEOUT_MS"),
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

async function processJob(
  config: WorkerConfig,
  job: ClaimedJob,
): Promise<JobHandlerResult> {
  const handlers: Record<SupportedJobType, (claimedJob: ClaimedJob) => Promise<JobHandlerResult>> = {
    GENERATE_AC: async (claimedJob) =>
      await handleGenerateAc(claimedJob, config.acGeneration),
    GENERATE_PLAN: async (claimedJob) =>
      await handleGeneratePlan(claimedJob, config.acGeneration),
  };

  const handler = handlers[job.type as SupportedJobType];

  if (!handler) {
    return {
      status: "failed",
      error: `Unsupported job type for this worker: ${job.type}`,
    };
  }

  try {
    return await handler(job);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const boundedMessage = message.slice(0, 4_000);

    console.error(
      `[worker] ${job.type} job ${job._id} failed before completion callback: ${boundedMessage}`,
    );

    return {
      status: "failed",
      error: boundedMessage,
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
