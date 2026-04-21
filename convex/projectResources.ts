import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "./_generated/dataModel";
import { resourceFormSchema } from "./validations";
import { assertProjectOwner, hasProjectAccess } from "./utils/projectAccess";

export const listForProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }): Promise<Doc<"projectResources">[]> => {
    const userId: Id<"users"> | null = await getAuthUserId(ctx);
    if (userId === null) return [];

    const hasAccess = await hasProjectAccess(ctx, projectId, userId);
    if (!hasAccess) return [];

    return await ctx.db
      .query("projectResources")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .collect();
  },
});

export const add = mutation({
  args: {
    projectId: v.id("projects"),
    url: v.string(),
    label: v.optional(v.string()),
    domain: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"projectResources">> => {
    const userId: Id<"users"> | null = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    await assertProjectOwner(ctx, args.projectId, userId);

    const parsed = resourceFormSchema.parse({
      url: args.url,
      label: args.label ?? "",
      domain: args.domain,
    });

    return await ctx.db.insert("projectResources", {
      projectId: args.projectId,
      url: parsed.url,
      label: parsed.label,
      domain: parsed.domain,
    });
  },
});

export const update = mutation({
  args: {
    resourceId: v.id("projectResources"),
    url: v.string(),
    label: v.optional(v.string()),
    domain: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    const userId: Id<"users"> | null = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const resource = await ctx.db.get("projectResources", args.resourceId);
    if (resource === null) throw new Error("Resource not found");

    await assertProjectOwner(ctx, resource.projectId, userId);

    const parsed = resourceFormSchema.parse({
      url: args.url,
      label: args.label ?? "",
      domain: args.domain,
    });

    await ctx.db.patch(args.resourceId, {
      url: parsed.url,
      label: parsed.label,
      domain: parsed.domain,
    });
  },
});

export const remove = mutation({
  args: {
    resourceId: v.id("projectResources"),
  },
  handler: async (ctx, { resourceId }): Promise<void> => {
    const userId: Id<"users"> | null = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const resource = await ctx.db.get("projectResources", resourceId);
    if (resource === null) throw new Error("Resource not found");

    await assertProjectOwner(ctx, resource.projectId, userId);

    await ctx.db.delete(resourceId);
  },
});
