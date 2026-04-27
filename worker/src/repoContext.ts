import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ContextBundle } from "./contextBundle.js";

const DEFAULT_CLONE_TIMEOUT_MS = 45_000;
const DEFAULT_SEARCH_TIMEOUT_MS = 20_000;
const DEFAULT_CONTEXT_TIMEOUT_MS = 45_000;
const DEFAULT_MAX_INPUT_CHARS = 18_000;
const DEFAULT_MAX_OUTPUT_CHARS = 3_000;
const MAX_ERROR_CHARS = 1_000;
const MAX_SEARCH_LINES = 80;
const MAX_MATCHING_FILES = 20;
const MAX_FILES_READ = 12;
const MAX_LINES_PER_FILE = 120;
const ALLOWED_GIT_HOSTS = new Set(["github.com", "gitlab.com", "bitbucket.org"]);
const TEXT_FILE_PATTERN = /\.(?:css|js|jsx|json|md|ts|tsx)$/i;

const STOPWORDS = new Set([
  "and",
  "are",
  "bug",
  "but",
  "can",
  "change",
  "for",
  "from",
  "have",
  "into",
  "make",
  "need",
  "task",
  "that",
  "the",
  "this",
  "ticket",
  "with",
]);

interface CommandResult {
  stdout: string;
  stderr: string;
  code: number | null;
}

interface RunCommandOptions {
  cwd?: string;
  timeoutMs: number;
  allowedExitCodes?: number[];
}

export interface RepoContextMetadata {
  source?: "git";
  provider?: "gemini";
  model?: string;
  gitRemoteUrl?: string;
  defaultBranch?: string;
  reason?: string;
  error?: string;
}

export interface RepoContextResult {
  used: boolean;
  summary: string;
  metadata: RepoContextMetadata;
}

function optionalEnv(name: string): string | null {
  const value = process.env[name];

  return value && value.trim().length > 0 ? value.trim() : null;
}

function parsePositiveIntEnv(name: string, fallback: number): number {
  const raw = optionalEnv(name);
  if (raw === null) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function truncate(value: string, maxChars: number): string {
  const normalized = value.trim();

  if (normalized.length <= maxChars) {
    return normalized;
  }

  return `${normalized.slice(0, maxChars)}\n[truncated]`;
}

async function runCommand(
  command: string,
  args: string[],
  options: RunCommandOptions,
): Promise<CommandResult> {
  const allowedExitCodes = options.allowedExitCodes ?? [0];

  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`${command} timed out after ${options.timeoutMs}ms`));
    }, options.timeoutMs);
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
        reject(
          new Error(
            `${command} exited with ${code ?? "unknown"}: ${truncate(stderr || stdout, MAX_ERROR_CHARS)}`,
          ),
        );
        return;
      }

      resolve({ stdout, stderr, code });
    });
  });
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

function normalizeTerms(value: string): string[] {
  const words = value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_/]/g, " ")
    .toLowerCase()
    .match(/[a-z0-9]{3,}/g);

  if (words === null) {
    return [];
  }

  return words.filter((word) => !STOPWORDS.has(word));
}

function extractSearchTerms(context: ContextBundle): string[] {
  const source = [
    context.ticketTitle,
    context.ticketDescription ?? "",
    context.ticketType,
    context.userPrompt ?? "",
  ].join(" ");

  return [...new Set(normalizeTerms(source))].slice(0, 12);
}

function isSafeRelativePath(filePath: string): boolean {
  return (
    filePath.length > 0 &&
    !path.isAbsolute(filePath) &&
    !filePath.split(/[\\/]/).includes("..")
  );
}

function shouldIgnoreFile(filePath: string): boolean {
  const parts = filePath.split("/");

  return parts.some((part) =>
    [".git", ".next", "build", "coverage", "dist", "node_modules"].includes(part),
  );
}

function isTextFile(filePath: string): boolean {
  return TEXT_FILE_PATTERN.test(filePath);
}

function isHighSignalFile(filePath: string): boolean {
  const lower = filePath.toLowerCase();

  return (
    lower === "readme.md" ||
    lower === "package.json" ||
    lower === "src/app.tsx" ||
    lower === "src/main.tsx" ||
    lower === "src/index.css" ||
    lower.startsWith("src/pages/") ||
    lower.includes("theme") ||
    lower.startsWith("tailwind.config.")
  );
}

function parseSearchFiles(output: string): string[] {
  const files: string[] = [];

  for (const line of output.split(/\r?\n/).slice(0, MAX_SEARCH_LINES)) {
    const firstColon = line.indexOf(":");
    if (firstColon === -1) {
      continue;
    }

    const filePath = line.slice(0, firstColon);
    if (!files.includes(filePath)) {
      files.push(filePath);
    }

    if (files.length >= MAX_MATCHING_FILES) {
      break;
    }
  }

  return files;
}

function scoreFile(filePath: string, terms: string[]): number {
  const lower = filePath.toLowerCase();
  let score = 0;

  for (const term of terms) {
    if (lower.includes(term)) {
      score += 20;
    }
  }

  if (lower.startsWith("src/pages/") || lower.includes("/pages/")) {
    score += 12;
  }

  if (lower.includes("/components/") || lower.includes("component")) {
    score += 10;
  }

  if (lower.includes("theme") || lower.endsWith(".css") || lower.startsWith("tailwind.config.")) {
    score += 8;
  }

  if (lower.includes("test") || lower.includes("spec")) {
    score += 6;
  }

  if (isHighSignalFile(filePath)) {
    score += 4;
  }

  if (lower.endsWith(".md")) {
    score -= 2;
  }

  return score;
}

async function listTrackedFiles(repoDir: string): Promise<string[]> {
  const result = await runCommand("git", ["-C", repoDir, "ls-files"], {
    timeoutMs: DEFAULT_SEARCH_TIMEOUT_MS,
  });

  return result.stdout
    .split(/\r?\n/)
    .filter((filePath) => isSafeRelativePath(filePath) && !shouldIgnoreFile(filePath));
}

async function searchRelevantFiles(repoDir: string, terms: string[]): Promise<string[]> {
  if (terms.length === 0) {
    return [];
  }

  const result = await runCommand(
    "rg",
    [
      "--ignore-case",
      "--line-number",
      "--no-heading",
      "--glob",
      "*.{css,js,jsx,json,md,ts,tsx}",
      "--glob",
      "!{.git,node_modules,dist,build,.next,coverage}/**",
      ...terms.flatMap((term) => ["-e", term]),
      ".",
    ],
    {
      cwd: repoDir,
      timeoutMs: parsePositiveIntEnv("REPO_CONTEXT_SEARCH_TIMEOUT_MS", DEFAULT_SEARCH_TIMEOUT_MS),
      allowedExitCodes: [0, 1],
    },
  );

  return parseSearchFiles(result.stdout);
}

async function readSnippet(repoDir: string, filePath: string): Promise<string | null> {
  if (!isSafeRelativePath(filePath) || shouldIgnoreFile(filePath) || !isTextFile(filePath)) {
    return null;
  }

  const absolutePath = path.join(repoDir, filePath);
  const content = await readFile(absolutePath, "utf8");
  const lines = content.split(/\r?\n/).slice(0, MAX_LINES_PER_FILE).join("\n");

  return [`File: ${filePath}`, "```", lines, "```"].join("\n");
}

async function collectRelevantRepoSnapshot(
  repoDir: string,
  context: ContextBundle,
): Promise<string> {
  const maxInputChars = parsePositiveIntEnv(
    "REPO_CONTEXT_MAX_INPUT_CHARS",
    DEFAULT_MAX_INPUT_CHARS,
  );
  const terms = extractSearchTerms(context);
  const trackedFiles = await listTrackedFiles(repoDir);
  const trackedSet = new Set(trackedFiles);
  const highSignalFiles = trackedFiles.filter((filePath) => isHighSignalFile(filePath));
  const searchedFiles = (await searchRelevantFiles(repoDir, terms)).filter((filePath) =>
    trackedSet.has(filePath),
  );
  const candidates = [...new Set([...searchedFiles, ...highSignalFiles])]
    .filter((filePath) => isTextFile(filePath))
    .sort((a, b) => scoreFile(b, terms) - scoreFile(a, terms))
    .slice(0, MAX_FILES_READ);
  const snippets: string[] = [];
  let totalChars = 0;

  for (const filePath of candidates) {
    const snippet = await readSnippet(repoDir, filePath);
    if (snippet === null) {
      continue;
    }

    const remainingChars = maxInputChars - totalChars;
    if (remainingChars <= 0) {
      break;
    }

    const boundedSnippet = truncate(snippet, remainingChars);
    snippets.push(boundedSnippet);
    totalChars += boundedSnippet.length;
  }

  return snippets.join("\n\n");
}

function buildRepoContextPrompt(context: ContextBundle, repoSnapshot: string): string {
  return [
    "You are preparing bounded repository context for acceptance-criteria generation.",
    "",
    "Ticket:",
    `- Title: ${context.ticketTitle}`,
    `- Type: ${context.ticketType}`,
    `- Description: ${context.ticketDescription ?? "No description provided."}`,
    context.userPrompt ? `- User refinement: ${context.userPrompt}` : "",
    "",
    "Repository snippets:",
    repoSnapshot,
    "",
    "Task:",
    "Return only concise, relevant context for writing Gherkin acceptance criteria.",
    "Include likely product area or UI/API surface, relevant files/modules, existing behavior or naming conventions, and visible test or acceptance patterns.",
    "Exclude unrelated implementation details.",
    "If snippets are not relevant, say: No relevant repository context found.",
    `Keep under ${parsePositiveIntEnv("REPO_CONTEXT_MAX_OUTPUT_CHARS", DEFAULT_MAX_OUTPUT_CHARS)} characters.`,
  ]
    .filter((part) => part.length > 0)
    .join("\n");
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

async function summarizeWithGemini(
  context: ContextBundle,
  repoSnapshot: string,
): Promise<{ summary: string; model: string }> {
  const provider = optionalEnv("REPO_CONTEXT_PROVIDER") ?? "gemini";
  if (provider !== "gemini") {
    throw new Error(`Unsupported REPO_CONTEXT_PROVIDER: ${provider}`);
  }

  const apiKey = optionalEnv("GEMINI_API_KEY");
  if (apiKey === null) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const model = optionalEnv("REPO_CONTEXT_MODEL");
  if (model === null) {
    throw new Error("Missing REPO_CONTEXT_MODEL");
  }

  const controller = new AbortController();
  const timeoutMs = parsePositiveIntEnv("REPO_CONTEXT_TIMEOUT_MS", DEFAULT_CONTEXT_TIMEOUT_MS);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const modelPath = model.startsWith("models/") ? model : `models/${model}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: buildRepoContextPrompt(context, repoSnapshot) }],
            },
          ],
          generationConfig: {
            maxOutputTokens: 1_024,
            temperature: 0.2,
          },
        }),
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      throw new Error(`Gemini repo context request failed with ${response.status}: ${await response.text()}`);
    }

    const payload = (await response.json()) as GeminiResponse;
    const summary = payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim();

    if (!summary) {
      throw new Error("Gemini repo context response was empty");
    }

    return {
      model,
      summary: truncate(
        summary,
        parsePositiveIntEnv("REPO_CONTEXT_MAX_OUTPUT_CHARS", DEFAULT_MAX_OUTPUT_CHARS),
      ),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function getRepoContext(context: ContextBundle): Promise<RepoContextResult> {
  if (context.gitRemoteUrl === null) {
    return {
      used: false,
      summary: "Repository context unavailable: no git repository URL configured.",
      metadata: { reason: "missing_git_remote_url" },
    };
  }

  const defaultBranch = context.defaultBranch ?? "main";
  const invalidReason = validateGitRemoteUrl(context.gitRemoteUrl);
  if (invalidReason !== null) {
    return {
      used: false,
      summary: "Repository context unavailable: git repository URL is not supported.",
      metadata: {
        reason: invalidReason,
        gitRemoteUrl: context.gitRemoteUrl,
        defaultBranch,
      },
    };
  }

  const repoDir = await mkdtemp(path.join(tmpdir(), `synapse-ac-context-${context.jobId}-`));

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
        context.gitRemoteUrl,
        repoDir,
      ],
      {
        timeoutMs: parsePositiveIntEnv(
          "REPO_CONTEXT_CLONE_TIMEOUT_MS",
          DEFAULT_CLONE_TIMEOUT_MS,
        ),
      },
    );

    const repoSnapshot = await collectRelevantRepoSnapshot(repoDir, context);
    if (repoSnapshot.trim().length === 0) {
      return {
        used: false,
        summary: "No relevant repository context found.",
        metadata: {
          source: "git",
          reason: "no_relevant_files",
          gitRemoteUrl: context.gitRemoteUrl,
          defaultBranch,
        },
      };
    }

    const { summary, model } = await summarizeWithGemini(context, repoSnapshot);

    return {
      used: true,
      summary,
      metadata: {
        source: "git",
        provider: "gemini",
        model,
        gitRemoteUrl: context.gitRemoteUrl,
        defaultBranch,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return {
      used: false,
      summary: "Repository context unavailable: git context extraction failed.",
      metadata: {
        source: "git",
        reason: "repo_context_failed",
        error: truncate(message, MAX_ERROR_CHARS),
        gitRemoteUrl: context.gitRemoteUrl,
        defaultBranch,
      },
    };
  } finally {
    await rm(repoDir, { recursive: true, force: true });
  }
}
