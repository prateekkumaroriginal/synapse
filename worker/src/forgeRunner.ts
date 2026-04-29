import { spawn } from "node:child_process";
import type { AcGenerationConfig } from "./types.js";

const MAX_FORGE_OUTPUT_CHARS = 32_000;

export function truncate(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;

  return `${value.slice(0, maxChars)}\n[truncated]`;
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

export async function runForge(
  config: AcGenerationConfig,
  prompt: string,
  options: { cwd?: string } = {},
): Promise<string> {
  const agentPrompt = config.forgeAgent.trim()
    ? `/${config.forgeAgent.trim()}\n${prompt}`
    : prompt;
  const args = [config.forgePromptFlag, agentPrompt];
  let stdout = "";
  let stderr = "";

  await new Promise<void>((resolve, reject) => {
    const child = spawn(config.forgeBin, args, {
      cwd: options.cwd,
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
