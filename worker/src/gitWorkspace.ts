import { access, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { optionalEnv, runCommand } from "./command.js";

const DEFAULT_GIT_TIMEOUT_MS = 120_000;

export interface WorkspaceOptions {
  ticketId: string;
  gitRemoteUrl: string | null;
  defaultBranch: string | null;
}

export interface PreparedWorkspace {
  repoDir: string;
  branchName: string;
}

function requireGitRemoteUrl(gitRemoteUrl: string | null): string {
  if (gitRemoteUrl === null || gitRemoteUrl.trim().length === 0) {
    throw new Error("Project gitRemoteUrl is required for code generation and validation");
  }

  return gitRemoteUrl.trim();
}

function safePathPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80);
}

function workspaceRoot(): string {
  return optionalEnv("WORKER_WORKSPACE_DIR") ?? "/tmp/synapse-worker";
}

export function branchNameForTicket(ticketId: string): string {
  return `synapse/ticket-${safePathPart(ticketId)}`;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function prepareWorkspace(
  options: WorkspaceOptions,
): Promise<PreparedWorkspace> {
  const gitRemoteUrl = requireGitRemoteUrl(options.gitRemoteUrl);
  const defaultBranch = options.defaultBranch?.trim() || "main";
  const branchName = branchNameForTicket(options.ticketId);
  const repoDir = path.join(workspaceRoot(), safePathPart(options.ticketId));

  await mkdir(workspaceRoot(), { recursive: true });
  await rm(repoDir, { recursive: true, force: true });
  await runCommand(
    "git",
    [
      "clone",
      "--depth",
      "1",
      "--single-branch",
      "--branch",
      defaultBranch,
      gitRemoteUrl,
      repoDir,
    ],
    { timeoutMs: DEFAULT_GIT_TIMEOUT_MS },
  );
  await runCommand("git", ["checkout", "-B", branchName], {
    cwd: repoDir,
    timeoutMs: DEFAULT_GIT_TIMEOUT_MS,
  });

  return { repoDir, branchName };
}

export async function getExistingWorkspace(repoDir: string): Promise<string> {
  const gitDir = path.join(repoDir, ".git");
  if (!(await pathExists(gitDir))) {
    throw new Error(`Workspace is not a git repository: ${repoDir}`);
  }

  return repoDir;
}

export async function getChangedFiles(repoDir: string): Promise<string[]> {
  const { stdout } = await runCommand("git", ["status", "--porcelain"], {
    cwd: repoDir,
    timeoutMs: DEFAULT_GIT_TIMEOUT_MS,
  });

  return stdout
    .split(/\r?\n/)
    .map((line) => line.slice(3).trim())
    .filter((line) => line.length > 0);
}

export async function getCurrentCommitSha(repoDir: string): Promise<string> {
  const { stdout } = await runCommand("git", ["rev-parse", "HEAD"], {
    cwd: repoDir,
    timeoutMs: DEFAULT_GIT_TIMEOUT_MS,
  });

  return stdout.trim();
}

export async function commitAllChanges(
  repoDir: string,
  message: string,
): Promise<string> {
  await runCommand("git", ["add", "--all"], {
    cwd: repoDir,
    timeoutMs: DEFAULT_GIT_TIMEOUT_MS,
  });
  await runCommand(
    "git",
    [
      "-c",
      "user.name=Synapse Worker",
      "-c",
      "user.email=synapse-worker@example.invalid",
      "commit",
      "-m",
      message,
    ],
    { cwd: repoDir, timeoutMs: DEFAULT_GIT_TIMEOUT_MS },
  );

  return await getCurrentCommitSha(repoDir);
}
