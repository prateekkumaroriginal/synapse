import { v } from "convex/values";
import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";

export type ViewerProfile = {
  _id: Id<"users">;
  email: string | null;
  name: string | null;
};

export const getViewerProfile = query({
  args: {},
  handler: async (ctx): Promise<ViewerProfile | null> => {
    const userId: Id<"users"> | null = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }
    const user = await ctx.db.get("users", userId);
    if (user === null) {
      return null;
    }
    return {
      _id: user._id,
      email: user.email ?? null,
      name: user.name ?? null,
    };
  },
});

export const searchUsers = query({
  args: { query: v.string(), projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    if (args.query.trim().length < 2) return [];

    // Exact email match
    const byEmail = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.query.trim()))
      .collect();

    // Text search on name
    const byName = await ctx.db
      .query("users")
      .withSearchIndex("search_name", (q) => q.search("name", args.query))
      .take(10);

    // Merge and deduplicate
    const resultsMap = new Map();
    for (const u of [...byEmail, ...byName]) {
      if (u._id === userId) continue; // Skip self
      resultsMap.set(u._id, u);
    }

    // Exclude existing members and owner
    const project = await ctx.db.get("projects", args.projectId);
    if (project) {
      resultsMap.delete(project.ownerId);
    }
    const members = await ctx.db
      .query("projectMembers")
      .withIndex("by_project", q => q.eq("projectId", args.projectId))
      .collect();
    for (const m of members) {
      resultsMap.delete(m.userId);
    }

    const results = Array.from(resultsMap.values()).slice(0, 10);
    return results.map(u => ({
      _id: u._id,
      name: u.name ?? null,
      email: u.email ?? null,
    }));
  }
});
