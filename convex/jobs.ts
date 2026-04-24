import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { assertProjectAccess, hasProjectAccess } from "./utils/projectAccess";
import { ArtifactType, JobType, jobType } from "./schema";

const JOB_TYPE_TO_ARTIFACT_TYPE: Partial<Record<JobType, ArtifactType>> = {
  GENERATE_AC: "AC",
  GENERATE_PLAN: "PLAN",
  GENERATE_CODE: "CODE",
};

export const enqueueJob = mutation({
  args: {
    ticketId: v.id("tickets"),
    type: jobType,
    args: v.any(),
    idempotencyKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const ticket = await ctx.db.get("tickets", args.ticketId);
    if (ticket === null) throw new Error("Ticket not found");

    await assertProjectAccess(ctx, ticket.projectId, userId);

    if (args.idempotencyKey !== undefined) {
      const existing = await ctx.db
        .query("asyncJobs")
        .withIndex("by_idempotencyKey", (q) =>
          q.eq("idempotencyKey", args.idempotencyKey!)
        )
        .first();

      if (existing !== null) {
        return existing._id;
      }
    }

    return await ctx.db.insert("asyncJobs", {
      ticketId: args.ticketId,
      projectId: ticket.projectId,
      type: args.type,
      status: "queued",
      attempt: 0,
      args: args.args,
      idempotencyKey: args.idempotencyKey ?? crypto.randomUUID(),
    });
  },
});

export const claimNextJob = internalMutation({
  args: {
    type: v.optional(jobType),
  },
  handler: async (ctx, args) => {
    const queuedJobs = await ctx.db
      .query("asyncJobs")
      .withIndex("by_status", (q) => q.eq("status", "queued"))
      .collect();

    let job = null;
    if (args.type) {
      job = queuedJobs.find(j => j.type === args.type) ?? null;
    } else {
      job = queuedJobs.length > 0 ? queuedJobs[0] : null;
    }

    if (job !== null) {
      await ctx.db.patch(job._id, {
        status: "running",
        startedAt: Date.now(),
        attempt: job.attempt + 1,
      });
      return await ctx.db.get("asyncJobs", job._id); // return full payload
    }
    return null;
  },
});

export const completeJob = internalMutation({
  args: {
    jobId: v.id("asyncJobs"),
    status: v.union(v.literal("succeeded"), v.literal("failed")),
    result: v.optional(v.any()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get("asyncJobs", args.jobId);
    if (!job) throw new Error("Job not found");

    if (job.status !== "running") {
      throw new Error("Job cannot be completed because its not running.");
    }

    let artifactId;

    if (args.result && typeof args.result.content === "string") {
      let type: ArtifactType | null = JOB_TYPE_TO_ARTIFACT_TYPE[job.type] ?? null;

      if (type !== null) {
        const existingArtifact = await ctx.db
          .query("artifacts")
          .withIndex("by_ticketId_and_type", (q) =>
            q.eq("ticketId", job.ticketId).eq("type", type!)
          )
          .unique();

        if (existingArtifact !== null) {
          await ctx.db.patch("artifacts", existingArtifact._id, {
            content: args.result.content,
            status: "draft",
            createdByJobId: job._id,
          });
          artifactId = existingArtifact._id;
        } else {
          artifactId = await ctx.db.insert("artifacts", {
            ticketId: job.ticketId,
            type: type,
            content: args.result.content,
            status: "draft",
            createdByJobId: job._id,
          });
        }
      }
    }

    await ctx.db.patch(job._id, {
      status: args.status,
      result: args.result,
      error: args.error,
      finishedAt: Date.now(),
      ...(artifactId !== undefined && { artifactId }),
    });
  },
});

export const listJobs = query({
  args: { ticketId: v.id("tickets") },
  handler: async (ctx, { ticketId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];

    const ticket = await ctx.db.get("tickets", ticketId);
    if (ticket === null) return [];

    if (!(await hasProjectAccess(ctx, ticket.projectId, userId))) return [];

    return await ctx.db
      .query("asyncJobs")
      .withIndex("by_ticketId", (q) => q.eq("ticketId", ticketId))
      .order("desc")
      .collect();
  },
});

export const cancelJob = mutation({
  args: { jobId: v.id("asyncJobs") },
  handler: async (ctx, { jobId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const job = await ctx.db.get("asyncJobs", jobId);
    if (job === null) throw new Error("Job not found");

    await assertProjectAccess(ctx, job.projectId, userId);

    if (job.status === "queued" || job.status === "running") {
      await ctx.db.patch(job._id, { status: "cancelled" });
    } else {
      throw new Error(`Cannot cancel job in status ${job.status}`);
    }
  },
});
