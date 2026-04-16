import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "./_generated/dataModel";
import { projectCreateFormSchema } from "./projectCreateSchema";

export const listMyProjects = query({
  args: {},
  handler: async (ctx): Promise<Doc<"projects">[]> => {
    const userId: Id<"users"> | null = await getAuthUserId(ctx);
    if (userId === null) {
      return [];
    }
    return await ctx.db
      .query("projects")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .order("desc")
      .collect();
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
    const parsed = projectCreateFormSchema.parse({
      name: args.name,
      description: args.description ?? "",
    });
    return await ctx.db.insert("projects", {
      name: parsed.name,
      description: parsed.description,
      ownerId: userId,
    });
  },
});
