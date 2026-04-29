import { buildPlanContextBundle } from "../contextBundle.js";
import { runForge, truncate } from "../forgeRunner.js";
import { prepareGitWorkspace } from "../gitWorkspace.js";
import type {
  AcGenerationConfig,
  ClaimedJob,
  JobHandlerResult,
} from "../types.js";

const PLAN_START = "[PLAN_START]";
const PLAN_END = "[PLAN_END]";
const MAX_PLAN_CONTEXT_CHARS = 24_000;

function findPlanBlocks(output: string): Array<{
  start: number;
  end: number;
  content: string;
}> {
  const blocks: Array<{ start: number; end: number; content: string }> = [];
  let searchIndex = 0;

  while (searchIndex < output.length) {
    const start = output.indexOf(PLAN_START, searchIndex);

    if (start === -1) break;

    const contentStart = start + PLAN_START.length;
    const end = output.indexOf(PLAN_END, contentStart);

    if (end === -1) break;

    const content = output
      .slice(contentStart, end)
      .trim()
      .replace(/\n{3,}/g, "\n\n");

    blocks.push({ start, end, content });
    searchIndex = end + PLAN_END.length;
  }

  return blocks;
}

function buildPlanPrompt(job: ClaimedJob): string {
  const context = buildPlanContextBundle(job);
  const ticketContext = truncate(
    [
      `Ticket title: ${context.ticketTitle}`,
      `Ticket type: ${context.ticketType}`,
      `Ticket description: ${context.ticketDescription ?? "Not provided"}`,
      `Git remote: ${context.gitRemoteUrl ?? "Not configured"}`,
      `Default branch: ${context.defaultBranch ?? "Not configured"}`,
      `Regeneration note: ${context.userPrompt ?? "None"}`,
      `Job id: ${context.jobId}`,
      `Attempt: ${context.attempt}`,
      `Approved AC artifact id: ${context.approvedAcceptanceCriteriaArtifactId}`,
    ].join("\n"),
    MAX_PLAN_CONTEXT_CHARS,
  );
  const approvedAcceptanceCriteria = truncate(
    context.approvedAcceptanceCriteria,
    MAX_PLAN_CONTEXT_CHARS,
  );

  return [
    "Generate an implementation plan for the ticket below.",
    "",
    "Before writing the plan, inspect the repository and existing code patterns. The approved acceptance criteria are the source of truth.",
    "",
    "Return only the implementation plan markdown wrapped exactly once between [PLAN_START] and [PLAN_END].",
    "Do not include commentary before [PLAN_START] or after [PLAN_END].",
    "",
    "The plan must be implementation-ready for a coding agent. Include:",
    "- Scope",
    "- Relevant files/modules to inspect or change",
    "- Data flow and behavior changes",
    "- Edge cases and failure modes",
    "- Tests/checks to run",
    "- Explicit non-goals",
    "",
    "Ticket context:",
    ticketContext,
    "",
    "Approved acceptance criteria:",
    approvedAcceptanceCriteria,
    "",
    "Required output format:",
    PLAN_START,
    "# Implementation Plan",
    "...",
    PLAN_END,
  ].join("\n");
}

function extractImplementationPlan(output: string): string {
  const blocks = findPlanBlocks(output);
  const nonEmptyBlocks = blocks.filter((block) => block.content.length > 0);

  if (!output.includes(PLAN_START) || !output.includes(PLAN_END)) {
    throw new Error("ForgeCode output did not include [PLAN_START] and [PLAN_END] markers");
  }

  if (blocks.length === 0) {
    throw new Error("ForgeCode output did not include a complete PLAN marker pair");
  }

  if (nonEmptyBlocks.length === 0) {
    throw new Error("ForgeCode output included empty implementation plan");
  }

  const selectedBlock = nonEmptyBlocks.at(-1);

  if (selectedBlock === undefined) {
    throw new Error("ForgeCode output included empty implementation plan");
  }

  return selectedBlock.content;
}

export async function handleGeneratePlan(
  job: ClaimedJob,
  config: AcGenerationConfig,
): Promise<JobHandlerResult> {
  const context = buildPlanContextBundle(job);
  const workspacePath = await prepareGitWorkspace({
    projectId: job.projectId,
    ticketId: job.ticketId,
    gitRemoteUrl: context.gitRemoteUrl,
    defaultBranch: context.defaultBranch,
  });
  const forgePrompt = buildPlanPrompt(job);
  const forgeOutput = await runForge(config, forgePrompt, { cwd: workspacePath });
  const content = extractImplementationPlan(forgeOutput);

  return {
    status: "succeeded",
    result: {
      content,
    },
  };
}
