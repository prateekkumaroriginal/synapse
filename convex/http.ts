import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

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

http.route({
  path: "/worker/claim",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!validateWorkerAuth(request)) {
      return new Response("Unauthorized", { status: 401 });
    }

    let args: { type?: any } = {};
    const text = await request.text();
    if (text) {
      try {
        args = JSON.parse(text);
      } catch (e) {
        return new Response("Invalid custom args format", { status: 400 });
      }
    }

    const job = await ctx.runMutation(internal.jobs.claimNextJob, { type: args.type });
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

export default http;
