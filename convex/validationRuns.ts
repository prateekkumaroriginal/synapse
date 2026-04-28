import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { hasProjectAccess } from "./utils/projectAccess";
import { validationOverallStatus, validationStepStatus } from "./schema";

const validationStep = v.object({
  name: v.string(),
  command: v.optional(v.string()),
  status: validationStepStatus,
  startedAt: v.number(),
  finishedAt: v.number(),
  logExcerpt: v.optional(v.string()),
});

export const listForTicket = query({
  args: { ticketId: v.id("tickets") },
  handler: async (ctx, { ticketId }): Promise<Doc<"validationRuns">[]> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];

    const ticket = await ctx.db.get("tickets", ticketId);
    if (ticket === null) return [];

    if (!(await hasProjectAccess(ctx, ticket.projectId, userId))) return [];

    return await ctx.db
      .query("validationRuns")
      .withIndex("by_ticketId", (q) => q.eq("ticketId", ticketId))
      .order("desc")
      .take(20);
  },
});

export const recordValidationRun = internalMutation({
  args: {
    jobId: v.id("asyncJobs"),
    ticketId: v.id("tickets"),
    codeJobId: v.optional(v.id("asyncJobs")),
    commitSha: v.optional(v.string()),
    branchName: v.optional(v.string()),
    steps: v.array(validationStep),
    overallStatus: validationOverallStatus,
    startedAt: v.number(),
    finishedAt: v.number(),
  },
  handler: async (ctx, args): Promise<Id<"validationRuns">> => {
    const existing = await ctx.db
      .query("validationRuns")
      .withIndex("by_jobId", (q) => q.eq("jobId", args.jobId))
      .unique();

    if (existing !== null) {
      return existing._id;
    }

    return await ctx.db.insert("validationRuns", args);
  },
});
