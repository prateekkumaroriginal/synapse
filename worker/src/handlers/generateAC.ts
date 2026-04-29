import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { buildContextBundle, type ContextBundle } from "../contextBundle.js";
import type { ClaimedJob, CodexConfig, JobHandlerResult } from "../types.js";

const execFileAsync = promisify(execFile);

const MAX_ERROR_LENGTH = 4_000;
const CODEX_TIMEOUT_MS = 10 * 60 * 1_000;

function boundError(message: string): string {
  return message.slice(0, MAX_ERROR_LENGTH);
}

export function buildCodexAcPrompt(context: ContextBundle): string {
  const description = context.ticketDescription ?? "No ticket description was provided.";
  const regenerationPrompt = context.userPrompt ?? "No regeneration prompt was provided.";

  return [
    "You are generating acceptance criteria for a product ticket.",
    "Inspect the repository in the current working directory if files are available.",
    "Return only the marked acceptance criteria block and no commentary outside the markers.",
    "",
    "Marker contract:",
    "[AC_START]",
    "# Acceptance Criteria",
    "",
    "## Scenario 1: ...",
    "- Given ...",
    "- When ...",
    "- Then ...",
    "[AC_END]",
    "",
    "Requirements:",
    "- Put all generated markdown between [AC_START] and [AC_END].",
    "- Do not include [AC_START] or [AC_END] inside the generated markdown body.",
    "- Write clear, testable acceptance criteria for the ticket.",
    "- Include repository-specific details when they are relevant and can be inferred safely.",
    "- If a regeneration prompt is present, use it to adjust or replace the acceptance criteria.",
    "",
    "Ticket context:",
    `Title: ${context.ticketTitle}`,
    `Type: ${context.ticketType}`,
    `Description: ${description}`,
    `Regeneration prompt: ${regenerationPrompt}`,
  ].join("\n");
}

async function cloneRepository(context: ContextBundle, workspace: string): Promise<void> {
  if (context.gitRemoteUrl === null) {
    return;
  }

  const args = ["clone", "--depth", "1"];

  if (context.defaultBranch !== null) {
    args.push("--branch", context.defaultBranch);
  }

  args.push(context.gitRemoteUrl, workspace);
  await execFileAsync("git", args, { timeout: CODEX_TIMEOUT_MS });
}

export async function prepareWorkspace(context: ContextBundle): Promise<string> {
  const workspace = await mkdtemp(join(tmpdir(), "synapse-generate-ac-"));
  await cloneRepository(context, workspace);
  return workspace;
}

export async function runCodexExec(
  config: CodexConfig,
  workspace: string,
  prompt: string,
): Promise<string> {
  const outputDir = await mkdtemp(join(tmpdir(), "synapse-codex-output-"));
  const outputFile = join(outputDir, "last-message.md");

  try {
    await execFileAsync(
      "codex",
      [
        "-a",
        "never",
        "exec",
        "--cd",
        workspace,
        "--sandbox",
        "read-only",
        "--skip-git-repo-check",
        "--output-last-message",
        outputFile,
        "-m",
        config.model,
        "-c",
        `model_provider="${config.cliProvider}"`,
        prompt,
      ],
      {
        timeout: CODEX_TIMEOUT_MS,
        maxBuffer: 10 * 1024 * 1024,
      },
    );

    return await readFile(outputFile, "utf8");
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
}

export function extractAcBlock(output: string): string {
  const startMarker = "[AC_START]";
  const endMarker = "[AC_END]";
  const startIndex = output.indexOf(startMarker);
  const endIndex = output.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    throw new Error("Codex output is missing a well-formed [AC_START]...[AC_END] block");
  }

  const extraStartIndex = output.indexOf(startMarker, startIndex + startMarker.length);
  const extraEndIndex = output.indexOf(endMarker, endIndex + endMarker.length);

  if (extraStartIndex !== -1 || extraEndIndex !== -1) {
    throw new Error("Codex output contains multiple acceptance criteria markers");
  }

  const contentStartIndex = startIndex + startMarker.length;
  const content = output.slice(contentStartIndex, endIndex).trim();

  if (!content) {
    throw new Error("Codex output contained an empty acceptance criteria block");
  }

  return content;
}

export async function handleGenerateAc(
  job: ClaimedJob,
  config: CodexConfig,
): Promise<JobHandlerResult> {
  let workspace: string | null = null;

  try {
    const context = buildContextBundle(job);
    const prompt = buildCodexAcPrompt(context);
    workspace = await prepareWorkspace(context);
    const output = await runCodexExec(config, workspace, prompt);
    const content = extractAcBlock(output);

    return {
      status: "succeeded",
      result: { content },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return {
      status: "failed",
      error: boundError(message),
    };
  } finally {
    if (workspace !== null) {
      await rm(workspace, { recursive: true, force: true });
    }
  }
}
