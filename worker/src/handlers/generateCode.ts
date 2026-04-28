import { commitAllChanges, getChangedFiles, prepareWorkspace } from "../gitWorkspace.js";
import type { ClaimedJob, GenerateCodeJobArgs, JobHandlerResult } from "../types.js";
import { runForgeAgent, truncate } from "../forge.js";

const MAX_ERROR_CHARS = 4_000;

function normalizeString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readArgs(job: ClaimedJob): GenerateCodeJobArgs {
  const args = job.args as Partial<GenerateCodeJobArgs>;
  const ticketTitle = normalizeString(args.ticketTitle);
  const approvedPlanContent = normalizeString(args.approvedPlanContent);

  if (
    args.phase !== "CODE_GENERATION" ||
    ticketTitle === null ||
    (args.ticketType !== "TASK" && args.ticketType !== "BUG") ||
    approvedPlanContent === null
  ) {
    throw new Error("GENERATE_CODE job args must include ticket fields and approvedPlanContent");
  }

  return {
    phase: "CODE_GENERATION",
    ticketTitle,
    ticketDescription: normalizeString(args.ticketDescription),
    ticketType: args.ticketType,
    gitRemoteUrl: normalizeString(args.gitRemoteUrl),
    defaultBranch: normalizeString(args.defaultBranch),
    userPrompt: normalizeString(args.userPrompt) ?? "",
    approvedPlanContent,
  };
}

function buildPrompt(args: GenerateCodeJobArgs): string {
  const refinement = args.userPrompt
    ? `\nUser refinement request:\n${args.userPrompt}\n`
    : "";

  return [
    "Implement the following approved plan.",
    "",
    "Rules:",
    "- Only make changes consistent with the approved plan.",
    "- Do not perform unrelated refactors.",
    "- Follow existing project conventions.",
    "- Use pnpm for package-management assumptions.",
    "- If the plan is ambiguous or impossible, stop and explain the blocker.",
    "- Return a concise summary and list files touched.",
    "- Do not include markdown fences.",
    "",
    "Ticket:",
    `- Title: ${args.ticketTitle}`,
    `- Type: ${args.ticketType}`,
    `- Description: ${args.ticketDescription ?? "No description provided."}`,
    `- Git remote: ${args.gitRemoteUrl ?? "Not configured."}`,
    `- Default branch: ${args.defaultBranch ?? "Not configured."}`,
    refinement.trim(),
    "",
    "Approved implementation plan:",
    args.approvedPlanContent,
  ]
    .filter((part) => part.length > 0)
    .join("\n");
}

function buildArtifactContent(
  branchName: string,
  commitSha: string,
  changedFiles: string[],
  summary: string,
): string {
  return [
    "# Code Generation Summary",
    "",
    `Branch: ${branchName}`,
    `Commit: ${commitSha}`,
    "",
    "## Changed Files",
    ...changedFiles.map((file) => `- ${file}`),
    "",
    "## Summary",
    summary,
  ].join("\n");
}

export async function handleGenerateCode(job: ClaimedJob): Promise<JobHandlerResult> {
  try {
    const args = readArgs(job);
    const workspace = await prepareWorkspace({
      ticketId: job.ticketId,
      gitRemoteUrl: args.gitRemoteUrl,
      defaultBranch: args.defaultBranch,
    });
    const summary = await runForgeAgent(
      "forge",
      buildPrompt(args),
      workspace.repoDir,
    );
    const changedFiles = await getChangedFiles(workspace.repoDir);

    if (changedFiles.length === 0) {
      throw new Error("ForgeCode completed but did not change any files");
    }

    const commitSha = await commitAllChanges(
      workspace.repoDir,
      `Implement ticket ${job.ticketId}`,
    );

    return {
      status: "succeeded",
      result: {
        content: buildArtifactContent(
          workspace.branchName,
          commitSha,
          changedFiles,
          summary,
        ),
        branchName: workspace.branchName,
        commitSha,
        changedFiles,
        summary,
        workspacePath: workspace.repoDir,
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
