import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { assertProjectOwner, hasProjectAccess } from "./utils/projectAccess";

export const listForProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const hasAccess = await hasProjectAccess(ctx, projectId, userId);
    if (!hasAccess) return [];

    const project = await ctx.db.get("projects", projectId);
    if (!project) return [];

    const members = await ctx.db
      .query("projectMembers")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .collect();

    // Include the owner as well for the UI to display
    const userIds = [project.ownerId, ...members.map((m) => m.userId)];

    const results = [];
    for (const uid of userIds) {
      const u = await ctx.db.get("users", uid);
      if (u) {
        // We'll also need the projectMembers _id so we can remove non-owners
        // The owner won't have a projectMembers _id, so we can return null for it
        let membershipId = null;
        if (uid !== project.ownerId) {
          const m = members.find((m) => m.userId === uid);
          membershipId = m ? m._id : null;
        }

        results.push({
          _id: membershipId,
          userId: u._id,
          name: u.name ?? null,
          email: u.email ?? null,
        });
      }
    }

    return results;
  },
});

export const addMember = mutation({
  args: {
    projectId: v.id("projects"),
    userId: v.id("users")
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Not authenticated");
    const project = await assertProjectOwner(ctx, args.projectId, authId);

    if (args.userId === project.ownerId) {
      throw new Error("Cannot add the owner as a member");
    }

    const targetUser = await ctx.db.get("users", args.userId);
    if (!targetUser) {
      throw new Error("User not found");
    }

    const existing = await ctx.db
      .query("projectMembers")
      .withIndex("by_project_and_user", (q) =>
        q.eq("projectId", args.projectId).eq("userId", args.userId),
      )
      .unique();

    if (existing) {
      throw new Error("User is already a member");
    }

    await ctx.db.insert("projectMembers", {
      projectId: args.projectId,
      userId: args.userId,
    });
  },
});

export const removeMember = mutation({
  args: {
    projectId: v.id("projects"),
    memberId: v.id("projectMembers")
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Not authenticated");

    await assertProjectOwner(ctx, args.projectId, authId);

    const membership = await ctx.db.get("projectMembers", args.memberId);
    if (!membership) {
      throw new Error("Membership not found");
    }

    if (membership.projectId !== args.projectId) {
      throw new Error("Membership does not belong to this project");
    }

    await ctx.db.delete("projectMembers", args.memberId);
  },
});
