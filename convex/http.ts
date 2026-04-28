import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { JOB_TYPES } from "./schema";
import type { JobType } from "./schema";

const http = httpRouter();

auth.addHttpRoutes(http);

function validateWorkerAuth(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }
  const token = authHeader.substring(7);
  const secret = process.env.WORKER_SECRET;
  if (!secret) return false;
  return token === secret;
}

function parseJobType(value: unknown): JobType | undefined {
  if (value === undefined) {
    return undefined;
  }

  return JOB_TYPES.includes(value as JobType) ? value as JobType : undefined;
}

http.route({
  path: "/worker/claim",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!validateWorkerAuth(request)) {
      return new Response("Unauthorized", { status: 401 });
    }

    let args: { type?: unknown } = {};
    const text = await request.text();
    if (text) {
      try {
        args = JSON.parse(text);
      } catch {
        return new Response("Invalid custom args format", { status: 400 });
      }
    }

    const jobType = parseJobType(args.type);
    if (args.type !== undefined && jobType === undefined) {
      return new Response("Invalid job type", { status: 400 });
    }

    const job = await ctx.runMutation(internal.jobs.claimNextJob, { type: jobType });
    if (job) {
      return new Response(JSON.stringify(job), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } else {
      return new Response(null, { status: 204 });
    }
  }),
});

http.route({
  path: "/worker/complete",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!validateWorkerAuth(request)) {
      return new Response("Unauthorized", { status: 401 });
    }

    try {
      const body = await request.json();
      const { jobId, status, result, error } = body;

      if (!jobId || !status) {
        return new Response("Missing jobId or status", { status: 400 });
      }

      await ctx.runMutation(internal.jobs.completeJob, {
        jobId,
        status,
        result,
        error,
      });

      return new Response("OK", { status: 200 });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Invalid JSON or completion failed";
      return new Response(errorMessage, { status: 400 });
    }
  }),
});

http.route({
  path: "/worker/validation-runs",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!validateWorkerAuth(request)) {
      return new Response("Unauthorized", { status: 401 });
    }

    try {
      const body = await request.json();
      const recordArgs = {
        jobId: body.jobId,
        ticketId: body.ticketId,
        steps: body.steps,
        overallStatus: body.overallStatus,
        startedAt: body.startedAt,
        finishedAt: body.finishedAt,
        ...(typeof body.codeJobId === "string" && { codeJobId: body.codeJobId }),
        ...(typeof body.commitSha === "string" && { commitSha: body.commitSha }),
        ...(typeof body.branchName === "string" && { branchName: body.branchName }),
      };

      const validationRunId = await ctx.runMutation(
        internal.validationRuns.recordValidationRun,
        recordArgs,
      );

      return new Response(JSON.stringify({ validationRunId }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : "Invalid JSON or validation run recording failed";
      return new Response(errorMessage, { status: 400 });
    }
  }),
});

export default http;
