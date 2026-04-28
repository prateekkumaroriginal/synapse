import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { runCommand, truncate } from "./command.js";

const DEFAULT_CLONE_TIMEOUT_MS = 120_000;
const ALLOWED_GIT_HOSTS = new Set(["github.com", "gitlab.com", "bitbucket.org"]);

export interface ForgeWorkspaceOptions {
  jobId: string;
  ticketId: string;
  gitRemoteUrl: string | null;
  defaultBranch: string | null;
  purpose: "ac" | "plan";
}

export interface ForgeWorkspace {
  cwd?: string;
  repoUsed: boolean;
  repoDir?: string;
  metadata: {
    gitRemoteUrl?: string;
    defaultBranch?: string;
    repoDir?: string;
    reason?: string;
    error?: string;
  };
  cleanup: () => Promise<void>;
}

function validateGitRemoteUrl(gitRemoteUrl: string): string | null {
  try {
    const url = new URL(gitRemoteUrl);

    if (url.protocol !== "https:") {
      return "unsupported_protocol";
    }

    if (!ALLOWED_GIT_HOSTS.has(url.hostname.toLowerCase())) {
      return "unsupported_host";
    }

    if (url.username || url.password) {
      return "embedded_credentials_not_supported";
    }

    return null;
  } catch {
    return "invalid_git_remote_url";
  }
}

function noRepoWorkspace(
  reason: string,
  metadata: ForgeWorkspace["metadata"] = {},
): ForgeWorkspace {
  return {
    repoUsed: false,
    metadata: { ...metadata, reason },
    cleanup: async () => {},
  };
}

export async function prepareForgeWorkspace(
  options: ForgeWorkspaceOptions,
): Promise<ForgeWorkspace> {
  const gitRemoteUrl = options.gitRemoteUrl?.trim() || null;
  const defaultBranch = options.defaultBranch?.trim() || "main";

  if (gitRemoteUrl === null) {
    return noRepoWorkspace("missing_git_remote_url");
  }

  const invalidReason = validateGitRemoteUrl(gitRemoteUrl);
  if (invalidReason !== null) {
    return noRepoWorkspace(invalidReason, {
      gitRemoteUrl,
      defaultBranch,
    });
  }

  const repoDir = await mkdtemp(
    path.join(tmpdir(), `synapse-forge-${options.purpose}-${options.jobId}-`),
  );

  try {
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
      { timeoutMs: DEFAULT_CLONE_TIMEOUT_MS },
    );

    return {
      cwd: repoDir,
      repoUsed: true,
      repoDir,
      metadata: {
        gitRemoteUrl,
        defaultBranch,
        repoDir,
      },
      cleanup: async () => {
        await rm(repoDir, { recursive: true, force: true });
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await rm(repoDir, { recursive: true, force: true });

    return noRepoWorkspace("repo_clone_failed", {
      gitRemoteUrl,
      defaultBranch,
      error: truncate(message, 1_000),
    });
  }
}
