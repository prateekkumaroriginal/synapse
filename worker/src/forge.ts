import { optionalEnv, requireProviderConfig, runCommand, truncate } from "./command.js";

const DEFAULT_COMMAND_TIMEOUT_MS = 120_000;
const FORGE_LOG_LINE_PATTERN =
  /(?:WARNING: Forge|Migrated \d+ provider|Initialize [0-9a-f-]{36}|\[[0-9:]+\]\s*(?:WARNING|Migrated|Initialize|Finished))/i;
const ANSI_ESCAPE_PATTERN =
  // eslint-disable-next-line no-control-regex
  /[\u001B\u009B][[\]()#;?]*(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]/g;

export function stripAnsi(value: string): string {
  return value.replace(ANSI_ESCAPE_PATTERN, "");
}

export function cleanForgeTextOutput(output: string, label: string): string {
  const cleaned = stripAnsi(output)
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
    throw new Error(`ForgeCode returned empty ${label}`);
  }

  return cleaned;
}

export async function runForgeAgent(
  agent: "muse" | "forge",
  prompt: string,
  cwd?: string,
): Promise<string> {
  const { content } = await runForgeAgentWithOutput(agent, prompt, cwd);

  return content;
}

export async function runForgeAgentWithOutput(
  agent: "muse" | "forge",
  prompt: string,
  cwd?: string,
): Promise<{ rawOutput: string; content: string }> {
  requireProviderConfig();

  const forgeBin = optionalEnv("FORGE_BIN") ?? "forge";
  const promptFlag = optionalEnv("FORGE_PROMPT_FLAG") ?? "-p";
  const timeoutMs = Number.parseInt(
    optionalEnv("FORGE_TIMEOUT_MS") ?? `${DEFAULT_COMMAND_TIMEOUT_MS}`,
    10,
  );
  const { stdout } = await runCommand(
    forgeBin,
    ["--agent", agent, promptFlag, prompt],
    { cwd, timeoutMs },
  );

  return {
    rawOutput: stdout,
    content: cleanForgeTextOutput(stdout, `${agent} output`),
  };
}

export { truncate };
