import { buildContextBundle, type ContextBundle } from "../contextBundle.js";
import { writeForgeDebugArtifacts } from "../debugArtifacts.js";
import { runForgeAgentWithOutput, truncate } from "../forge.js";
import { prepareForgeWorkspace, type ForgeWorkspace } from "../forgeWorkspace.js";
import type { ClaimedJob, JobHandlerResult } from "../types.js";

const MAX_ERROR_CHARS = 4_000;
const GHERKIN_RESPONSE_START_PATTERN = /^(?:Feature:|#{1,6}\s*Scenario:)/i;
const AC_START_MARKER = "[AC_START]";
const AC_END_MARKER = "[AC_END]";

function buildAcceptanceCriteriaPrompt(
  context: ContextBundle,
  workspace: ForgeWorkspace,
): string {
  const refinement = context.userPrompt
    ? `\nUser refinement request:\n${context.userPrompt}\n`
    : "";
  const repoInstruction = workspace.repoUsed
    ? "A repository is available in the current working directory. Inspect it directly as needed."
    : "No repository checkout is available. Use only the ticket context below.";

  return [
    "Return the final answer only.",
    "Do not describe your thinking.",
    "Do not summarize what you are doing.",
    "Do not include progress updates.",
    "Do not include completion messages.",
    "Do not include logs.",
    "Do not include markdown fences.",
    `Put the acceptance criteria that should be saved between ${AC_START_MARKER} and ${AC_END_MARKER}.`,
    `Anything outside ${AC_START_MARKER} and ${AC_END_MARKER} will be ignored.`,
    `Use this exact structure: ${AC_START_MARKER}\\nFeature: ...\\n${AC_END_MARKER}`,
    "Use only Gherkin-style acceptance criteria in markdown.",
    "Use concise scenarios with Given/When/Then steps.",
    repoInstruction,
    "Use repository details only when directly relevant to the ticket.",
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
  ]
    .filter((part) => part.length > 0)
    .join("\n");
}

function extractMarkedAcceptanceCriteria(output: string): string {
  const startIndex = output.indexOf(AC_START_MARKER);
  const endIndex = output.indexOf(AC_END_MARKER);

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    throw new Error(
      `ForgeCode did not return acceptance criteria between ${AC_START_MARKER} and ${AC_END_MARKER}. Received: ${truncate(output, MAX_ERROR_CHARS)}`,
    );
  }

  return output
    .slice(startIndex + AC_START_MARKER.length, endIndex)
    .trim()
    .replace(/^```(?:gherkin|markdown|md)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function cleanAcceptanceCriteriaOutput(output: string): string {
  const cleaned = extractMarkedAcceptanceCriteria(output);

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

export async function handleGenerateAc(job: ClaimedJob): Promise<JobHandlerResult> {
  const context = buildContextBundle(job);
  const workspace = await prepareForgeWorkspace({
    jobId: job._id,
    ticketId: job.ticketId,
    gitRemoteUrl: context.gitRemoteUrl,
    defaultBranch: context.defaultBranch,
    purpose: "ac",
  });

  try {
    const prompt = buildAcceptanceCriteriaPrompt(context, workspace);
    const { rawOutput, content } = await runForgeAgentWithOutput(
      "muse",
      prompt,
      workspace.cwd,
    );
    const cleaned = cleanAcceptanceCriteriaOutput(content);

    await writeForgeDebugArtifacts({
      purpose: "ac",
      jobId: job._id,
      ticketId: job.ticketId,
      prompt,
      rawOutput,
      cleanedOutput: cleaned,
      metadata: {
        repoUsed: workspace.repoUsed,
        workspace: workspace.metadata,
      },
    });

    return {
      status: "succeeded",
      result: {
        content: cleaned,
        repoContextUsed: workspace.repoUsed,
        repoContextMetadata: workspace.metadata,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return {
      status: "failed",
      error: truncate(message, MAX_ERROR_CHARS),
    };
  } finally {
    await workspace.cleanup();
  }
}
