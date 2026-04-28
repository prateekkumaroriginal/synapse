import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export interface ForgeDebugArtifactInput {
  purpose: "ac" | "plan";
  jobId: string;
  ticketId: string;
  prompt: string;
  rawOutput: string;
  cleanedOutput: string;
  metadata: Record<string, unknown>;
}

export interface ForgeDebugArtifactPaths {
  promptPath: string;
  rawPath: string;
  cleanedPath: string;
  metadataPath: string;
}

function safeFilePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80);
}

function projectRoot(): string {
  const cwd = process.cwd();

  return path.basename(cwd) === "worker" ? path.dirname(cwd) : cwd;
}

function debugOutputDir(): string {
  return process.env.FORGE_DEBUG_OUTPUT_DIR?.trim() ||
    path.resolve(projectRoot(), "debug", "forge-generations");
}

export async function writeForgeDebugArtifacts(
  input: ForgeDebugArtifactInput,
): Promise<ForgeDebugArtifactPaths> {
  const outputDir = debugOutputDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const baseName = `${timestamp}_${input.purpose}_ticket-${safeFilePart(input.ticketId)}_job-${safeFilePart(input.jobId)}`;
  const promptPath = path.join(outputDir, `${baseName}.prompt.md`);
  const rawPath = path.join(outputDir, `${baseName}.raw.md`);
  const cleanedPath = path.join(outputDir, `${baseName}.cleaned.md`);
  const metadataPath = path.join(outputDir, `${baseName}.debug.json`);

  await mkdir(outputDir, { recursive: true });
  await writeFile(promptPath, input.prompt, "utf8");
  await writeFile(rawPath, input.rawOutput, "utf8");
  await writeFile(cleanedPath, input.cleanedOutput, "utf8");
  await writeFile(
    metadataPath,
    JSON.stringify(
      {
        ...input.metadata,
        purpose: input.purpose,
        jobId: input.jobId,
        ticketId: input.ticketId,
        timestamp,
        promptLength: input.prompt.length,
        rawOutputLength: input.rawOutput.length,
        cleanedOutputLength: input.cleanedOutput.length,
        promptPath,
        rawPath,
        cleanedPath,
        metadataPath,
      },
      null,
      2,
    ),
    "utf8",
  );

  return {
    promptPath,
    rawPath,
    cleanedPath,
    metadataPath,
  };
}
