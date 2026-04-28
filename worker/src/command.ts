import { spawn } from "node:child_process";

const DEFAULT_TIMEOUT_MS = 120_000;

export interface CommandResult {
  stdout: string;
  stderr: string;
  code: number | null;
}

export interface RunCommandOptions {
  cwd?: string;
  input?: string;
  timeoutMs?: number;
  allowedExitCodes?: number[];
}

export function optionalEnv(name: string): string | null {
  const value = process.env[name];

  return value && value.trim().length > 0 ? value.trim() : null;
}

export function truncate(value: string, maxChars: number): string {
  const normalized = value.trim();

  if (normalized.length <= maxChars) {
    return normalized;
  }

  return `${normalized.slice(0, maxChars)}\n[truncated]`;
}

export function requireProviderConfig(): void {
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

export async function runCommand(
  command: string,
  args: string[],
  options: RunCommandOptions = {},
): Promise<CommandResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const allowedExitCodes = options.allowedExitCodes ?? [0];

  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
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

      if (!allowedExitCodes.includes(code ?? -1)) {
        reject(new Error(`${command} exited with ${code ?? "unknown"}: ${truncate(stderr || stdout, 4_000)}`));
        return;
      }

      resolve({ stdout, stderr, code });
    });

    if (options.input) {
      child.stdin.write(options.input);
    }

    child.stdin.end();
  });
}
