import { mkdir } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { truncate } from "./forgeRunner.js";

const MAX_GIT_OUTPUT_CHARS = 16_000;
const GIT_TIMEOUT_MS = 120_000;

function sanitizePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

async function runGit(args: string[], cwd?: string): Promise<string> {
  let stdout = "";
  let stderr = "";

  await new Promise<void>((resolve, reject) => {
    const child = spawn("git", args, {
      cwd,
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: process.env.GIT_TERMINAL_PROMPT ?? "0",
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let settled = false;
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
    }, GIT_TIMEOUT_MS);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (chunk: string) => {
      stdout = truncate(stdout + chunk, MAX_GIT_OUTPUT_CHARS);
    });

    child.stderr.on("data", (chunk: string) => {
      stderr = truncate(stderr + chunk, MAX_GIT_OUTPUT_CHARS);
    });

    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(new Error(`git ${args.join(" ")} failed: ${error.message}`));
    });

    child.on("close", (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);

      if (code === 0) {
        resolve();
        return;
      }

      const details = [
        `git ${args.join(" ")} failed`,
        code !== null ? `exit code: ${code}` : null,
        signal !== null ? `signal: ${signal}` : null,
        stderr.trim() ? `stderr:\n${stderr.trim()}` : null,
        stdout.trim() ? `stdout:\n${stdout.trim()}` : null,
      ].filter((part): part is string => part !== null);

      reject(new Error(truncate(details.join("\n\n"), 4_000)));
    });
  });

  return [stdout, stderr].filter(Boolean).join("\n").trim();
}

async function hasGitCheckout(workspacePath: string): Promise<boolean> {
  try {
    await runGit(["rev-parse", "--is-inside-work-tree"], workspacePath);
    return true;
  } catch {
    return false;
  }
}

export async function prepareGitWorkspace({
  projectId,
  ticketId,
  gitRemoteUrl,
  defaultBranch,
}: {
  projectId: string;
  ticketId: string;
  gitRemoteUrl: string | null;
  defaultBranch: string | null;
}): Promise<string> {
  if (gitRemoteUrl === null) {
    throw new Error("Project gitRemoteUrl is required for plan generation");
  }

  if (defaultBranch === null) {
    throw new Error("Project defaultBranch is required for plan generation");
  }

  const workspaceRoot = path.join(process.cwd(), ".worker-workspaces");
  const workspacePath = path.join(
    workspaceRoot,
    sanitizePathSegment(projectId),
    sanitizePathSegment(ticketId),
  );

  await mkdir(path.dirname(workspacePath), { recursive: true });

  if (!(await hasGitCheckout(workspacePath))) {
    await runGit([
      "clone",
      "--depth",
      "1",
      "--branch",
      defaultBranch,
      gitRemoteUrl,
      workspacePath,
    ]);
    return workspacePath;
  }

  await runGit(["remote", "set-url", "origin", gitRemoteUrl], workspacePath);
  await runGit(["fetch", "--depth", "1", "origin", defaultBranch], workspacePath);
  await runGit(["checkout", "-B", defaultBranch, `origin/${defaultBranch}`], workspacePath);
  await runGit(["reset", "--hard", `origin/${defaultBranch}`], workspacePath);
  await runGit(["clean", "-fd"], workspacePath);

  return workspacePath;
}
