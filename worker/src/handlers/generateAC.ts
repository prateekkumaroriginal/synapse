import { spawn } from "node:child_process";
import { buildContextBundle } from "../contextBundle.js";
import type {
  AcGenerationConfig,
  ClaimedJob,
  JobHandlerResult,
} from "../types.js";

const AC_START = "[AC_START]";
const AC_END = "[AC_END]";
const MAX_TICKET_CONTEXT_CHARS = 8_000;
const MAX_MODEL_OUTPUT_CHARS = 8_000;
const MAX_FORGE_OUTPUT_CHARS = 32_000;

function truncate(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;

  return `${value.slice(0, maxChars)}\n[truncated]`;
}

function findAcceptanceCriteriaBlocks(output: string): Array<{
  start: number;
  end: number;
  content: string;
}> {
  const blocks: Array<{ start: number; end: number; content: string }> = [];
  let searchIndex = 0;

  while (searchIndex < output.length) {
    const start = output.indexOf(AC_START, searchIndex);

    if (start === -1) break;

    const contentStart = start + AC_START.length;
    const end = output.indexOf(AC_END, contentStart);

    if (end === -1) break;

    const content = output
      .slice(contentStart, end)
      .trim()
      .replace(/\n{3,}/g, "\n\n");

    blocks.push({ start, end, content });
    searchIndex = end + AC_END.length;
  }

  return blocks;
}

function buildTicketContext(job: ClaimedJob): string {
  const context = buildContextBundle(job);
  const lines = [
    `Ticket title: ${context.ticketTitle}`,
    `Ticket type: ${context.ticketType}`,
    `Ticket description: ${context.ticketDescription ?? "Not provided"}`,
    `Git remote: ${context.gitRemoteUrl ?? "Not configured"}`,
    `Default branch: ${context.defaultBranch ?? "Not configured"}`,
    `Regeneration note: ${context.userPrompt ?? "None"}`,
    `Job id: ${context.jobId}`,
    `Attempt: ${context.attempt}`,
  ];

  return truncate(lines.join("\n"), MAX_TICKET_CONTEXT_CHARS);
}

function getOpenAiCompatibleUrl(config: AcGenerationConfig): string {
  if (config.contextModelProvider === "openai") {
    return "https://api.openai.com/v1/chat/completions";
  }

  if (config.contextModelProvider === "openrouter") {
    return "https://openrouter.ai/api/v1/chat/completions";
  }

  if (config.contextModelBaseUrl === null) {
    throw new Error("CONTEXT_MODEL_BASE_URL is required for openai-compatible providers");
  }

  return `${config.contextModelBaseUrl.replace(/\/$/, "")}/chat/completions`;
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text();

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`Context model returned non-JSON response: ${text.slice(0, 500)}`);
  }
}

function readObject(value: unknown, label: string): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  throw new Error(`Context model response missing ${label}`);
}

function readFirstTextPart(value: unknown): string {
  if (!Array.isArray(value)) return "";

  return value
    .map((part) => {
      if (typeof part === "object" && part !== null && "text" in part) {
        const text = (part as { text?: unknown }).text;
        return typeof text === "string" ? text : "";
      }

      return "";
    })
    .filter(Boolean)
    .join("\n");
}

async function callOpenAiCompatibleContextModel(
  config: AcGenerationConfig,
  prompt: string,
): Promise<string> {
  const url = getOpenAiCompatibleUrl(config);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.contextModelApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.contextModelName,
      messages: [
        {
          role: "system",
          content:
            "You produce concise product/context questions that help another coding agent write acceptance criteria. Do not write the acceptance criteria.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 1_000,
    }),
    signal: AbortSignal.timeout(config.contextModelTimeoutMs),
  });

  if (!response.ok) {
    throw new Error(
      `Context model failed with ${response.status}: ${(await response.text()).slice(0, 1_000)}`,
    );
  }

  const data = readObject(await parseJsonResponse(response), "response object");
  const choices = data.choices;

  if (!Array.isArray(choices) || choices.length === 0) {
    throw new Error("Context model response did not include choices");
  }

  const firstChoice = readObject(choices[0], "choice");
  const message = readObject(firstChoice.message, "message");
  const content = message.content;

  if (typeof content !== "string" || content.trim().length === 0) {
    throw new Error("Context model returned empty content");
  }

  return truncate(content.trim(), MAX_MODEL_OUTPUT_CHARS);
}

async function callGeminiContextModel(
  config: AcGenerationConfig,
  prompt: string,
): Promise<string> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    config.contextModelName,
  )}:generateContent?key=${encodeURIComponent(config.contextModelApiKey)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: [
                "You produce concise product/context questions that help another coding agent write acceptance criteria.",
                "Do not write the acceptance criteria.",
                "",
                prompt,
              ].join("\n"),
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1_000,
      },
    }),
    signal: AbortSignal.timeout(config.contextModelTimeoutMs),
  });

  if (!response.ok) {
    throw new Error(
      `Context model failed with ${response.status}: ${(await response.text()).slice(0, 1_000)}`,
    );
  }

  const data = readObject(await parseJsonResponse(response), "response object");
  const candidates = data.candidates;

  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new Error("Context model response did not include candidates");
  }

  const firstCandidate = readObject(candidates[0], "candidate");
  const content = readObject(firstCandidate.content, "content");
  const text = readFirstTextPart(content.parts);

  if (text.trim().length === 0) {
    throw new Error("Context model returned empty content");
  }

  return truncate(text.trim(), MAX_MODEL_OUTPUT_CHARS);
}

async function askContextQuestions(
  config: AcGenerationConfig,
  ticketContext: string,
): Promise<string> {
  const prompt = [
    "Given this ticket context, identify the specific clarifying/context questions and implementation-facing considerations ForgeCode should use before producing acceptance criteria.",
    "Return concise markdown bullets only.",
    "Do not answer the questions and do not write acceptance criteria.",
    "",
    ticketContext,
  ].join("\n");

  if (config.contextModelProvider === "gemini") {
    return await callGeminiContextModel(config, prompt);
  }

  return await callOpenAiCompatibleContextModel(config, prompt);
}

function buildForgePrompt(ticketContext: string, contextQuestions: string): string {
  return [
    "Generate acceptance criteria for the ticket below.",
    "",
    "Use the context questions/instructions to infer the right acceptance coverage, then produce the final acceptance criteria.",
    "Return only the acceptance criteria markdown wrapped exactly once between [AC_START] and [AC_END].",
    "Do not include commentary before [AC_START] or after [AC_END].",
    "",
    "Ticket context:",
    ticketContext,
    "",
    "Context questions/instructions:",
    contextQuestions,
    "",
    "Required output format:",
    AC_START,
    "# Acceptance Criteria",
    "...",
    AC_END,
  ].join("\n");
}

function formatForgeFailure(
  message: string,
  stdout: string,
  stderr: string,
  code: number | null,
  signal: NodeJS.Signals | null,
): string {
  const parts = [
    message,
    code !== null ? `exit code: ${code}` : null,
    signal !== null ? `signal: ${signal}` : null,
    stderr.trim() ? `stderr:\n${stderr.trim()}` : null,
    stdout.trim() ? `stdout:\n${stdout.trim()}` : null,
  ].filter((part): part is string => part !== null);

  return truncate(parts.join("\n\n"), 4_000);
}

async function runForge(
  config: AcGenerationConfig,
  prompt: string,
): Promise<string> {
  const agentPrompt = config.forgeAgent.trim()
    ? `/${config.forgeAgent.trim()}\n${prompt}`
    : prompt;
  const args = [config.forgePromptFlag, agentPrompt];
  let stdout = "";
  let stderr = "";

  await new Promise<void>((resolve, reject) => {
    const child = spawn(config.forgeBin, args, {
      env: {
        ...process.env,
        CI: process.env.CI ?? "true",
        NO_COLOR: process.env.NO_COLOR ?? "1",
        TERM: process.env.TERM ?? "dumb",
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let settled = false;
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
    }, config.forgeTimeoutMs);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (chunk: string) => {
      stdout = truncate(stdout + chunk, MAX_FORGE_OUTPUT_CHARS);
    });

    child.stderr.on("data", (chunk: string) => {
      stderr = truncate(stderr + chunk, MAX_FORGE_OUTPUT_CHARS);
    });

    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      const failure = formatForgeFailure(
        error.message,
        stdout,
        stderr,
        null,
        null,
      );
      reject(new Error(`ForgeCode failed:\n${failure}`));
    });

    child.on("close", (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);

      if (code === 0) {
        resolve();
        return;
      }

      const failure = formatForgeFailure(
        "ForgeCode process exited unsuccessfully",
        stdout,
        stderr,
        code,
        signal,
      );
      reject(new Error(`ForgeCode failed:\n${failure}`));
    });
  });

  const output = [stdout, stderr].filter(Boolean).join("\n").trim();

  if (output.length === 0) {
    throw new Error("ForgeCode returned empty output");
  }

  return truncate(output, MAX_FORGE_OUTPUT_CHARS);
}

function extractAcceptanceCriteria(output: string): string {
  const blocks = findAcceptanceCriteriaBlocks(output);
  const nonEmptyBlocks = blocks.filter((block) => block.content.length > 0);

  if (!output.includes(AC_START) || !output.includes(AC_END)) {
    throw new Error("ForgeCode output did not include [AC_START] and [AC_END] markers");
  }

  if (blocks.length === 0) {
    throw new Error("ForgeCode output did not include a complete AC marker pair");
  }

  if (nonEmptyBlocks.length === 0) {
    throw new Error("ForgeCode output included empty acceptance criteria");
  }

  const selectedBlock = nonEmptyBlocks.at(-1);

  if (selectedBlock === undefined) {
    throw new Error("ForgeCode output included empty acceptance criteria");
  }

  return selectedBlock.content;
}

export async function handleGenerateAc(
  job: ClaimedJob,
  config: AcGenerationConfig,
): Promise<JobHandlerResult> {
  const ticketContext = buildTicketContext(job);
  const contextQuestions = await askContextQuestions(config, ticketContext);
  const forgePrompt = buildForgePrompt(ticketContext, contextQuestions);
  const forgeOutput = await runForge(config, forgePrompt);
  const content = extractAcceptanceCriteria(forgeOutput);

  return {
    status: "succeeded",
    result: {
      content,
    },
  };
}
