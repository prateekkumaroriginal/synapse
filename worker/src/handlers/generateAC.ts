import { spawn } from "node:child_process";
import { buildContextBundle, type ContextBundle } from "../contextBundle.js";
import { getRepoContext } from "../repoContext.js";
import type { ClaimedJob, JobHandlerResult } from "../types.js";

const DEFAULT_COMMAND_TIMEOUT_MS = 120_000;
const MAX_ERROR_CHARS = 4_000;
const GHERKIN_RESPONSE_START_PATTERN = /^(?:Feature:|#{1,6}\s*Scenario:)/i;
const FORGE_LOG_LINE_PATTERN =
  /(?:WARNING: Forge|Migrated \d+ provider|Initialize [0-9a-f-]{36}|\[[0-9:]+\]\s*(?:WARNING|Migrated|Initialize|Finished))/i;

interface CommandResult {
  stdout: string;
  stderr: string;
}

interface RunCommandOptions {
  input?: string;
  timeoutMs?: number;
}

function optionalEnv(name: string): string | null {
  const value = process.env[name];

  return value && value.trim().length > 0 ? value.trim() : null;
}

function requireProviderConfig(): void {
  const providerKeys = [
    "ANTHROPIC_API_KEY",
    "GEMINI_API_KEY",
    "GOOGLE_AI_STUDIO_API_KEY",
    "OPENAI_API_KEY",
    "OPENROUTER_API_KEY",
    "FORGE_PROVIDER_API_KEY",
  ];

  if (providerKeys.some((key) => optionalEnv(key) !== null)) {
    return;
  }

  throw new Error(
    `Missing provider API key. Set one of ${providerKeys.join(", ")} for non-interactive ForgeCode execution.`,
  );
}

function truncate(value: string, maxChars: number): string {
  const normalized = value.trim();

  if (normalized.length <= maxChars) {
    return normalized;
  }

  return `${normalized.slice(0, maxChars)}\n[truncated]`;
}

async function runCommand(
  command: string,
  args: string[],
  options: RunCommandOptions = {},
): Promise<CommandResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;

  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`${command} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer) => stdoutChunks.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderrChunks.push(chunk));
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);

      const stdout = Buffer.concat(stdoutChunks).toString("utf8");
      const stderr = Buffer.concat(stderrChunks).toString("utf8");

      if (code !== 0) {
        reject(
          new Error(
            `${command} exited with ${code ?? "unknown"}: ${truncate(stderr || stdout, MAX_ERROR_CHARS)}`,
          ),
        );
        return;
      }

      resolve({ stdout, stderr });
    });

    if (options.input) {
      child.stdin.write(options.input);
    }

    child.stdin.end();
  });
}

function buildAcceptanceCriteriaPrompt(
  context: ContextBundle,
  repoContext: string,
): string {
  const refinement = context.userPrompt
    ? `\nUser refinement request:\n${context.userPrompt}\n`
    : "";

  return [
    "Return the final answer only.",
    "Do not describe your thinking.",
    "Do not summarize what you are doing.",
    "Do not include progress updates.",
    "Do not include completion messages.",
    "Do not include logs.",
    "Do not include markdown fences.",
    "Your entire response must start with either `Feature:` or `### Scenario:`.",
    "Use only Gherkin-style acceptance criteria in markdown.",
    "Use concise scenarios with Given/When/Then steps.",
    "Use repository context only when it is directly relevant to the ticket.",
    "Do not mention unrelated implementation details.",
    "If you cannot produce acceptance criteria, return exactly: ERROR: Unable to generate acceptance criteria",
    "",
    "Ticket:",
    `- Title: ${context.ticketTitle}`,
    `- Type: ${context.ticketType}`,
    `- Description: ${context.ticketDescription ?? "No description provided."}`,
    `- Git remote: ${context.gitRemoteUrl ?? "Not configured."}`,
    `- Default branch: ${context.defaultBranch ?? "Not configured."}`,
    refinement.trim(),
    "",
    "Bounded repo context:",
    repoContext,
  ]
    .filter((part) => part.length > 0)
    .join("\n");
}

function cleanForgeOutput(output: string): string {
  const cleaned = output
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trim();

      return trimmed.length > 0 && !FORGE_LOG_LINE_PATTERN.test(trimmed);
    })
    .join("\n")
    .trim()
    .replace(/^```(?:markdown|md)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  if (cleaned.length === 0) {
    throw new Error("ForgeCode returned empty acceptance criteria");
  }

  if (cleaned === "ERROR: Unable to generate acceptance criteria") {
    throw new Error(cleaned);
  }

  if (!GHERKIN_RESPONSE_START_PATTERN.test(cleaned)) {
    throw new Error(
      `ForgeCode violated the acceptance criteria output contract. Expected output to start with Feature: or ### Scenario:. Received: ${truncate(output, MAX_ERROR_CHARS)}`,
    );
  }

  return cleaned;
}

async function runForgeMuse(prompt: string): Promise<string> {
  requireProviderConfig();

  const forgeBin = optionalEnv("FORGE_BIN") ?? "forge";
  const forgeAgent = optionalEnv("FORGE_AGENT") ?? "muse";
  const promptFlag = optionalEnv("FORGE_PROMPT_FLAG") ?? "-p";
  const timeoutMs = Number.parseInt(
    optionalEnv("FORGE_TIMEOUT_MS") ?? `${DEFAULT_COMMAND_TIMEOUT_MS}`,
    10,
  );
  const { stdout } = await runCommand(
    forgeBin,
    ["--agent", forgeAgent, promptFlag, prompt],
    { timeoutMs },
  );

  return cleanForgeOutput(stdout);
}

export async function handleGenerateAc(job: ClaimedJob): Promise<JobHandlerResult> {
  try {
    const context = buildContextBundle(job);
    const repoContext = await getRepoContext(context);
    const prompt = buildAcceptanceCriteriaPrompt(context, repoContext.summary);
    const content = await runForgeMuse(prompt);

    return {
      status: "succeeded",
      result: {
        content,
        repoContextUsed: repoContext.used,
        repoContextMetadata: repoContext.metadata,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return {
      status: "failed",
      error: truncate(message, MAX_ERROR_CHARS),
    };
  }
}
