import { writeForgeDebugArtifacts } from "../debugArtifacts.js";
import { runForgeAgentWithOutput, truncate } from "../forge.js";
import { prepareForgeWorkspace, type ForgeWorkspace } from "../forgeWorkspace.js";
import type { ClaimedJob, GeneratePlanJobArgs, JobHandlerResult } from "../types.js";

const MAX_ERROR_CHARS = 4_000;

function debugLog(message: string, payload?: unknown): void {
  if (payload === undefined) {
    console.log(`[worker][generate-plan] ${message}`);
    return;
  }

  console.log(`[worker][generate-plan] ${message}`, payload);
}

function normalizeString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readArgs(job: ClaimedJob): GeneratePlanJobArgs {
  const args = job.args as Partial<GeneratePlanJobArgs>;
  const ticketTitle = normalizeString(args.ticketTitle);
  const approvedAcContent = normalizeString(args.approvedAcContent);

  if (
    args.phase !== "PLANNING" ||
    ticketTitle === null ||
    (args.ticketType !== "TASK" && args.ticketType !== "BUG") ||
    approvedAcContent === null
  ) {
    throw new Error("GENERATE_PLAN job args must include ticket fields and approvedAcContent");
  }

  return {
    phase: "PLANNING",
    ticketTitle,
    ticketDescription: normalizeString(args.ticketDescription),
    ticketType: args.ticketType,
    gitRemoteUrl: normalizeString(args.gitRemoteUrl),
    defaultBranch: normalizeString(args.defaultBranch),
    userPrompt: normalizeString(args.userPrompt) ?? "",
    approvedAcContent,
  };
}

function buildPrompt(
  args: GeneratePlanJobArgs,
  workspace: ForgeWorkspace,
): string {
  const refinement = args.userPrompt
    ? `\nUser refinement request:\n${args.userPrompt}\n`
    : "";
  const repoInstruction = workspace.repoUsed
    ? "A repository is available in the current working directory. Inspect it directly as needed before planning."
    : "No repository checkout is available. Use only the ticket and approved acceptance criteria below.";

  return [
    "Return the final answer only.",
    "Do not describe your thinking.",
    "Do not include logs, progress updates, completion messages, or markdown fences.",
    "Create a practical implementation plan for this ticket.",
    repoInstruction,
    "Use the approved acceptance criteria as the source of truth.",
    "Follow existing repository conventions and architecture.",
    "Do not invent files or APIs when existing code provides a pattern.",
    "",
    "Include these sections:",
    "## Overview",
    "## Files likely to change",
    "## Backend changes",
    "## Frontend changes",
    "## Validation plan",
    "## Risks and assumptions",
    "",
    "Ticket:",
    `- Title: ${args.ticketTitle}`,
    `- Type: ${args.ticketType}`,
    `- Description: ${args.ticketDescription ?? "No description provided."}`,
    `- Git remote: ${args.gitRemoteUrl ?? "Not configured."}`,
    `- Default branch: ${args.defaultBranch ?? "Not configured."}`,
    refinement.trim(),
    "",
    "Approved acceptance criteria:",
    args.approvedAcContent,
  ]
    .filter((part) => part.length > 0)
    .join("\n");
}

export async function handleGeneratePlan(job: ClaimedJob): Promise<JobHandlerResult> {
  try {
    debugLog("started", {
      jobId: job._id,
      ticketId: job.ticketId,
      attempt: job.attempt,
    });

    const args = readArgs(job);
    debugLog("parsed args", {
      ticketTitle: args.ticketTitle,
      ticketType: args.ticketType,
      hasDescription: args.ticketDescription !== null,
      hasGitRemoteUrl: args.gitRemoteUrl !== null,
      defaultBranch: args.defaultBranch,
      hasUserPrompt: args.userPrompt.trim().length > 0,
      approvedAcContentLength: args.approvedAcContent.length,
    });

    const workspace = await prepareForgeWorkspace({
      jobId: job._id,
      ticketId: job.ticketId,
      gitRemoteUrl: args.gitRemoteUrl,
      defaultBranch: args.defaultBranch,
      purpose: "plan",
    });

    try {
      debugLog("workspace prepared", {
        repoUsed: workspace.repoUsed,
        metadata: workspace.metadata,
      });

      const prompt = buildPrompt(args, workspace);
      debugLog("running forge muse", {
        promptLength: prompt.length,
        cwd: workspace.cwd,
      });

      const { rawOutput, content } = await runForgeAgentWithOutput(
        "muse",
        prompt,
        workspace.cwd,
      );
      const paths = await writeForgeDebugArtifacts({
        purpose: "plan",
        jobId: job._id,
        ticketId: job.ticketId,
        prompt,
        rawOutput,
        cleanedOutput: content,
        metadata: {
          repoUsed: workspace.repoUsed,
          workspace: workspace.metadata,
          approvedAcContentLength: args.approvedAcContent.length,
        },
      });

      debugLog("generated plan", {
        length: content.length,
        content,
        debugPaths: paths,
      });

      return {
        status: "succeeded",
        result: {
          content,
          repoContextUsed: workspace.repoUsed,
          repoContextMetadata: workspace.metadata,
        },
      };
    } finally {
      await workspace.cleanup();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    debugLog("failed", {
      jobId: job._id,
      error: message,
    });

    return {
      status: "failed",
      error: truncate(message, MAX_ERROR_CHARS),
    };
  }
}
