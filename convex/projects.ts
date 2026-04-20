import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "./_generated/dataModel";
import { projectFormSchema } from "./validations";
import { assertProjectOwner, hasProjectAccess } from "./utils/projectAccess";

export const getProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }): Promise<Doc<"projects"> | null> => {
    const userId: Id<"users"> | null = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }
    const hasAccess = await hasProjectAccess(ctx, projectId, userId);
    if (!hasAccess) {
      return null;
    }
    return await ctx.db.get("projects", projectId);
  },
});

export const listMyProjects = query({
  args: {},
  handler: async (ctx): Promise<Doc<"projects">[]> => {
    const userId: Id<"users"> | null = await getAuthUserId(ctx);
    if (userId === null) {
      return [];
    }

    const owned = await ctx.db
      .query("projects")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .filter((q) => q.eq(q.field("isArchived"), false))
      .collect();

    const memberships = await ctx.db
      .query("projectMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const memberProjects = await Promise.all(
      memberships.map((m) => ctx.db.get("projects", m.projectId)),
    );

    const allProjects: Doc<"projects">[] = [...owned];
    for (const p of memberProjects) {
      if (p !== null) {
        allProjects.push(p);
      }
    }

    return allProjects
      .filter((p) => !p.isArchived)
      .sort((a, b) => b._creationTime - a._creationTime);
  },
});

export const listArchivedProjects = query({
  args: {},
  handler: async (ctx): Promise<Doc<"projects">[]> => {
    const userId: Id<"users"> | null = await getAuthUserId(ctx);
    if (userId === null) {
      return [];
    }
    const owned = await ctx.db
      .query("projects")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .order("desc")
      .collect();

    return owned.filter((p) => p.isArchived);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"projects">> => {
    const userId: Id<"users"> | null = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }
    const parsed = projectFormSchema.parse({
      name: args.name,
      description: args.description ?? "",
    });
    return await ctx.db.insert("projects", {
      name: parsed.name,
      description: parsed.description,
      ownerId: userId,
      isArchived: false,
    });
  },
});

export const update = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    const userId: Id<"users"> | null = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }
    await assertProjectOwner(ctx, args.projectId, userId);

    const parsed = projectFormSchema.parse({
      name: args.name,
      description: args.description ?? "",
    });

    await ctx.db.patch(args.projectId, {
      name: parsed.name,
      description: parsed.description,
    });
  },
});

export const archive = mutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args): Promise<void> => {
    const userId: Id<"users"> | null = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }
    await assertProjectOwner(ctx, args.projectId, userId);
    await ctx.db.patch(args.projectId, { isArchived: true });
  },
});

export const unarchive = mutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args): Promise<void> => {
    const userId: Id<"users"> | null = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }
    await assertProjectOwner(ctx, args.projectId, userId);
    await ctx.db.patch(args.projectId, { isArchived: false });
  },
});

export const deleteProject = mutation({
  args: {
    projectId: v.id("projects")
  },
  handler: async (ctx, args): Promise<void> => {
    const userId: Id<"users"> | null = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const project = await assertProjectOwner(ctx, args.projectId, userId);
    if (!project.isArchived) {
      throw new Error("Project must be archived first");
    }

    // TODO: If projects grow to have many tickets/members, replace these
    // inline loops with ctx.scheduler.runAfter(0, ...) to avoid hitting
    // Convex transaction limits.
    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const t of tickets) {
      await ctx.db.delete(t._id);
    }

    const members = await ctx.db
      .query("projectMembers")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const m of members) {
      await ctx.db.delete(m._id);
    }

    await ctx.db.delete(args.projectId);
  },
});
